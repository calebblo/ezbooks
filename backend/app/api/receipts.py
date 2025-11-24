# backend/app/api/receipts.py

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from uuid import uuid4
from decimal import Decimal
import io
import time
import os

from app.core.aws import table_receipts, table_vendors, table_users, s3_client
from app.core import config
from parser.receipt_textract import parse_receipt_from_bytes
from botocore.exceptions import ClientError
# Import get_current_user for dependency injection
# Note: We import inside the function or use a string forward ref if circular, 
# but here we can try top level if no cycle. 
# To be safe and avoid cycles with main.py/auth.py, we can import inside or use a separate deps file.
# For now, let's just fetch the user manually in the function to avoid complex dependency refactoring.
from app.api.auth import get_current_user

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
    date: Optional[str] = Form(default=None),
    amount: Optional[float] = Form(default=None),
    taxAmount: Optional[float] = Form(default=None),
    paymentMethod: Optional[str] = Form(default=None),
):
    """
    Upload a receipt image, run OCR with Textract (Bytes API),
    and save to DynamoDB.
    """
    # Check limits
    user = get_current_user()
    if user.limit is not None and user.usage >= user.limit:
        raise HTTPException(status_code=403, detail=f"Upload limit reached ({user.limit} receipts). Please upgrade to Pro.")

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

    vendor_suggestion = None
    card_match = None
    ocr_result = {}

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

        # Send email if date is missing (Pending status)
        if not parsed_date:
            from app.utils.email import send_email
            # In a real app, we'd get the user's email from the DB or auth token
            # For now, we'll use a hardcoded email or env var, or just log it as per the util
            user_email = os.getenv("EMAIL_TO", "user@example.com")
            send_email(
                subject="Action Required: Pending Receipt Upload",
                body=f"A receipt was uploaded but we couldn't parse the date. Please review it in your dashboard.\n\nReceipt ID: {receipt_id}",
                to_email=user_email
            )
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

    # Auto-add vendor if new
    if vendorId_value:
        # Check if exists (by name)
        existing_vendors_resp = table_vendors.query(
            KeyConditionExpression="userId = :uid",
            ExpressionAttributeValues={":uid": DEMO_USER_ID}
        )
        existing_names = {v["name"].lower() for v in existing_vendors_resp.get("Items", [])}
        
        if vendorId_value.lower() not in existing_names:
            # Create new vendor
            new_vendor_id = str(uuid4())
            table_vendors.put_item(Item={
                "userId": DEMO_USER_ID,
                "vendorId": new_vendor_id,
                "name": vendorId_value,
                "matchKeywords": [vendorId_value.upper()]
            })

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

    # Card / Payment Method
    # If paymentMethod is provided by form, use it.
    # Otherwise, use the extracted payment method (Cash or **** 1234)
    if paymentMethod not in (None, "", "null"):
        cardId_value = paymentMethod
    else:
        cardId_value = ocr_result.get("paymentMethod")

    # 4) Determine status based on completeness
    has_required_fields = (
        bool(vendorId_value)
        and amount_decimal is not None
        and tax_decimal is not None
        and date_value not in (None, "", "null")
    )
    status_value = "PROCESSED" if has_required_fields else "PENDING"

    # 5) Build item for DynamoDB
    # 6) Save to DynamoDB
    item = {
        "receiptId": receipt_id,
        "userId": DEMO_USER_ID,
        "imageUrl": image_url, # Used image_url as defined earlier
        "rawText": raw_text,
        "status": status_value, # Used status_value as calculated
        "created": int(time.time()), # Added created timestamp
        # Extracted fields
        "vendorId": vendorId_value, # Used vendorId_value
        "jobId": jobId, # Used jobId from form
        "category": category_value, # Used category_value
        "date": date_value, # Used date_value
        "amount": amount_decimal, # Used amount_decimal
        "taxAmount": tax_decimal, # Used tax_decimal
        "cardId": cardId_value, # Used cardId_value
    }
    table_receipts.put_item(Item=item)

    # 7) Increment user usage
    try:
        table_users.update_item(
            Key={"userId": DEMO_USER_ID},
            UpdateExpression="SET monthlyUsage = if_not_exists(monthlyUsage, :start) + :inc",
            ExpressionAttributeValues={
                ":start": 0,
                ":inc": 1
            }
        )
    except Exception as e:
        print(f"Failed to update usage stats: {e}")

    return ReceiptOut(**item)


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


class ReceiptUpdate(BaseModel):
    vendorId: Optional[str] = None
    jobId: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    taxAmount: Optional[float] = None
    cardId: Optional[str] = None
    date: Optional[str] = None
    status: Optional[str] = None


@router.patch("/{receipt_id}", response_model=ReceiptOut)
def update_receipt(receipt_id: str, updates: ReceiptUpdate):
    """Update a receipt's fields."""
    # 1) Get existing receipt
    resp = table_receipts.get_item(
        Key={"userId": DEMO_USER_ID, "receiptId": receipt_id}
    )
    item = resp.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Receipt not found")

    # 2) Prepare update expression
    update_expr_parts = []
    expr_attr_values = {}
    expr_attr_names = {}

    # Helper to add field update
    def add_update(field_name, value):
        if value is not None:
            # Handle special reserved words if any (date/status usually fine in DDB but good practice)
            # For simplicity, we just use the field name directly unless it conflicts
            placeholder = f":{field_name}"
            update_expr_parts.append(f"#{field_name} = {placeholder}")
            expr_attr_values[placeholder] = value
            expr_attr_names[f"#{field_name}"] = field_name

    add_update("vendorId", updates.vendorId)
    add_update("jobId", updates.jobId)
    add_update("category", updates.category)
    if updates.amount is not None:
        add_update("amount", Decimal(str(updates.amount)))
    if updates.taxAmount is not None:
        add_update("taxAmount", Decimal(str(updates.taxAmount)))
    add_update("cardId", updates.cardId)
    add_update("date", updates.date)
    add_update("status", updates.status)

    if not update_expr_parts:
        return item  # No updates

    update_expression = "SET " + ", ".join(update_expr_parts)

    # 3) Update item
    updated_resp = table_receipts.update_item(
        Key={"userId": DEMO_USER_ID, "receiptId": receipt_id},
        UpdateExpression=update_expression,
        ExpressionAttributeValues=expr_attr_values,
        ExpressionAttributeNames=expr_attr_names,
        ReturnValues="ALL_NEW",
    )
    
    return updated_resp.get("Attributes")


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
