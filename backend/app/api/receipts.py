# backend/app/api/receipts.py

from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from uuid import uuid4
from decimal import Decimal
import io
import smtplib
from email.mime.text import MIMEText

from app.core.aws import table_receipts, s3_client
from app.core import config
from parser.receipt_textract import parse_receipt_from_bytes
from botocore.exceptions import ClientError

router = APIRouter(prefix="/receipts", tags=["receipts"])

DEMO_USER_ID = "demo-user"


class ReceiptOut(BaseModel):
    receiptId: str
    userId: str

    vendorId: Optional[str] = None
    jobId: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    taxAmount: Optional[float] = None
    cardId: Optional[str] = None
    date: Optional[str] = None

    imageUrl: str
    rawText: Optional[str] = None
    status: Optional[str] = None


@router.get("/", response_model=List[ReceiptOut])
def list_receipts():
    """Return all receipts for the demo user."""
    resp = table_receipts.query(
        KeyConditionExpression="userId = :uid",
        ExpressionAttributeValues={":uid": DEMO_USER_ID},
    )
    items = resp.get("Items", [])

    # For response: surface vendor name in the vendorId field if available
    normalized = []
    for item in items:
        vendor_name = item.get("vendorName") or item.get("vendorId")
        normalized.append({**item, "vendorId": vendor_name, "vendorName": None})
    return normalized


@router.post("/", response_model=ReceiptOut)
async def upload_receipt(
    file: UploadFile = File(...),
    vendorId: Optional[str] = Form(default=None),
    jobId: Optional[str] = Form(default=None),
    category: Optional[str] = Form(default=None),
    amount: Optional[str] = Form(default=None),
    taxAmount: Optional[str] = Form(default=None),
    cardId: Optional[str] = Form(default=None),
    date: Optional[str] = Form(default=None),
):
    """
    Upload a receipt image, run OCR with Textract (Bytes API),
    upload the image to S3, and create a DynamoDB entry.
    """

    # 0) Read the file ONCE into memory and never touch file.file again
    file_bytes = await file.read()

    receipt_id = str(uuid4())

    # 1) Run OCR on the bytes (Textract + match_vendor/match_card)
    raw_text = None
    vendor_text = None
    parsed_amount = None
    parsed_date = None
    vendor_suggestion = None
    card_match = None

    try:
        ocr_result = parse_receipt_from_bytes(file_bytes)
        raw_text = ocr_result.get("rawText")
        vendor_text = ocr_result.get("vendorText")
        parsed_amount = ocr_result.get("amount")
        parsed_date = ocr_result.get("date")
        parsed_tax = ocr_result.get("taxAmount")
        vendor_suggestion = ocr_result.get("vendorSuggestion")
        card_match = ocr_result.get("cardMatch")
    except ClientError as e:
        # If Textract fails, we still want the upload to succeed
        print("Textract error, skipping OCR:", e)

    # 2) Upload the same bytes to S3
    s3_key = f"{DEMO_USER_ID}/receipts/{receipt_id}-{file.filename}"

    s3_client.upload_fileobj(
        io.BytesIO(file_bytes),
        config.S3_BUCKET_RECEIPTS,
        s3_key,
        ExtraArgs={"ContentType": file.content_type or "application/octet-stream"},
    )

    image_url = f"s3://{config.S3_BUCKET_RECEIPTS}/{s3_key}"

    # 3) Use OCR values as defaults, but let form override them

    # Vendor + category
    if (vendorId is None or vendorId == "") and vendor_suggestion:
        vendorId_value = vendor_suggestion.get("vendorId")
        category_value = category or vendor_suggestion.get("category")
    else:
        vendorId_value = vendorId
        category_value = category

    # Amount: form string takes priority; otherwise OCR; otherwise None
    if amount not in (None, "", "null"):
        amount_decimal = Decimal(amount)
    elif parsed_amount is not None:
        amount_decimal = Decimal(str(parsed_amount))
    else:
        amount_decimal = None

        # Tax – form overrides OCR; OCR used as fallback
    if taxAmount not in (None, "", "null"):
        tax_decimal = Decimal(taxAmount)
    elif parsed_tax is not None:
        tax_decimal = Decimal(str(parsed_tax))
    else:
        tax_decimal = None


    # Date
    if date not in (None, "", "null"):
        date_value = date
    else:
        date_value = parsed_date

    # Card – you could use card_match here if you wire it to cardId
    cardId_value = cardId

    # Vendor name for display (prefer matched name, then OCR text)
    vendor_name_value = None
    if vendor_suggestion and vendor_suggestion.get("name"):
        vendor_name_value = vendor_suggestion.get("name")
    elif vendor_text:
        vendor_name_value = vendor_text.strip() or None
    elif raw_text:
        vendor_name_value = raw_text.split("\n")[0].strip() or None
    # 4) Build item for DynamoDB
    item = {
        "userId": DEMO_USER_ID,
        "receiptId": receipt_id,

        "vendorId": vendorId_value,
        "jobId": jobId,
        "category": category_value,
        "amount": amount_decimal,
        "taxAmount": tax_decimal,
        "cardId": cardId_value,
        "date": date_value,

        "imageUrl": image_url,
        "rawText": raw_text,
        "status": "OCR_PARSED" if raw_text else "UPLOADED",
    }

    table_receipts.put_item(Item=item)
    print(
        f"Uploaded receipt {receipt_id} with vendorId: {vendorId_value or '(none)'}"
        f" | vendorName: {vendor_name_value or '(unknown)'}"
    )
    if not vendorId_value:
        _notify_missing_vendor(item, vendor_name_value)

    # Response: vendorId field returns the vendor name for client display (no separate vendorName key)
    return {**item, "vendorId": vendor_name_value or vendorId_value, "vendorName": None}


def _notify_missing_vendor(item: dict, vendor_name: Optional[str]) -> None:
    """
    Email the team when vendor is missing.
    Best-effort: logs to stdout on failure.
    """
    if not config.NOTIFY_EMAIL or not config.SMTP_HOST:
        return

    subject = f"[EZBooks] Missing vendor for receipt {item.get('receiptId')}"
    body_lines = [
        "A receipt was uploaded without a vendorId.",
        f"Receipt ID: {item.get('receiptId')}",
        f"User ID: {item.get('userId')}",
        f"Image: {item.get('imageUrl')}",
        f"OCR vendor text: {vendor_name or '(unknown)'}",
        "",
        "Raw text:",
        item.get("rawText") or "(none)",
    ]
    body = "\n".join(body_lines)

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = config.NOTIFY_FROM_EMAIL
    msg["To"] = config.NOTIFY_EMAIL

    try:
        if config.SMTP_USE_TLS:
            with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=10) as server:
                server.starttls()
                if config.SMTP_USER and config.SMTP_PASSWORD:
                    server.login(config.SMTP_USER, config.SMTP_PASSWORD)
                server.sendmail(config.NOTIFY_FROM_EMAIL, [config.NOTIFY_EMAIL], msg.as_string())
        else:
            with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=10) as server:
                if config.SMTP_USER and config.SMTP_PASSWORD:
                    server.login(config.SMTP_USER, config.SMTP_PASSWORD)
                server.sendmail(config.NOTIFY_FROM_EMAIL, [config.NOTIFY_EMAIL], msg.as_string())
    except Exception as exc:  # pragma: no cover
        print(f"Email failed for missing vendor: {exc}")
