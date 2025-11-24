# backend/app/api/receipts.py

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from uuid import uuid4
from decimal import Decimal
import io

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
    return resp.get("Items", [])


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
    vendor_text = None  # internal use; not persisted
    parsed_amount = None
    parsed_date = None
    vendor_suggestion = None
    card_match = None

    try:
        ocr_result = parse_receipt_from_bytes(file_bytes)
        raw_text = ocr_result.get("rawText")
        vendor_text = ocr_result.get("vendorText")
        # Treat marketing header "DELIVER HOW" as no vendor
        if vendor_text and vendor_text.strip().upper() == "DELIVER HOW":
            vendor_text = None
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
        vendor_name_value = vendor_suggestion.get("name") or vendor_text
        vendorId_value = vendor_name_value  # use human-readable name in vendorId
        category_value = category or vendor_suggestion.get("category")
    else:
        vendor_name_value = vendor_text
        vendorId_value = vendor_name_value or vendorId  # prefer detected name
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

    # 4) Determine status based on completeness
    has_required_fields = (
        bool(vendorId_value)
        and amount_decimal is not None
        and tax_decimal is not None
        and date_value not in (None, "", "null")
    )
    status_value = "PROCESSED" if has_required_fields else "PENDING"

    # 5) Build item for DynamoDB
    item = {
        "userId": DEMO_USER_ID,
        "receiptId": receipt_id,

        "vendorId": vendorId_value,  # vendorId now carries the human-readable name
        "jobId": jobId,
        "category": category_value,
        "amount": amount_decimal,
        "taxAmount": tax_decimal,
        "cardId": cardId_value,
        "date": date_value,

        "imageUrl": image_url,
        "rawText": raw_text,
        "status": status_value,
    }

    table_receipts.put_item(Item=item)
    return item


@router.delete("/{receipt_id}")
def delete_receipt(receipt_id: str):
    """Delete a single receipt by id for the demo user."""
    table_receipts.delete_item(
        Key={"userId": DEMO_USER_ID, "receiptId": receipt_id}
    )
    return {"deleted": [receipt_id]}


@router.delete("/")
def delete_receipts(ids: Optional[str] = None, deleteAll: bool = False):
    """
    Delete multiple receipts.
    - If deleteAll=true, delete every receipt for the demo user.
    - Else, provide a comma-separated `ids` list.
    """
    if deleteAll:
        resp = table_receipts.query(
            KeyConditionExpression="userId = :uid",
            ExpressionAttributeValues={":uid": DEMO_USER_ID},
        )
        items = resp.get("Items", [])
        ids_to_delete = [r["receiptId"] for r in items]
    else:
        if not ids:
            raise HTTPException(status_code=400, detail="ids required when deleteAll is false")
        ids_to_delete = [i.strip() for i in ids.split(",") if i.strip()]

    if not ids_to_delete:
        return {"deleted": []}

    with table_receipts.batch_writer() as batch:
        for rid in ids_to_delete:
            batch.delete_item(Key={"userId": DEMO_USER_ID, "receiptId": rid})

    return {"deleted": ids_to_delete}


@router.get("/{receipt_id}/image")
def get_receipt_image(receipt_id: str):
    """Return a short-lived presigned URL for the receipt image."""
    resp = table_receipts.get_item(
        Key={"userId": DEMO_USER_ID, "receiptId": receipt_id}
    )
    item = resp.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Receipt not found")

    image_url = item.get("imageUrl")
    if not image_url or not image_url.startswith("s3://"):
        raise HTTPException(status_code=400, detail="No S3 image available for this receipt")

    without_scheme = image_url.replace("s3://", "")
    parts = without_scheme.split("/", 1)
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid S3 image URL")
    bucket, key = parts

    presigned = s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=3600,
    )
    return {"url": presigned}
