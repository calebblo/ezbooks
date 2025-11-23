# backend/app/api/receipts.py

from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from uuid import uuid4

from app.core.aws import table_receipts, s3_client
from app.core import config

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
    vendorId: Optional[str] = Form(None),
    jobId: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    amount: Optional[float] = Form(None),
    taxAmount: Optional[float] = Form(None),
    cardId: Optional[str] = Form(None),
    date: Optional[str] = Form(None),  # ISO string or whatever your frontend uses
):
    """
    Upload a receipt image to S3 and create a DynamoDB entry.

    Frontend sends multipart/form-data with:
      - file: the image
      - optional vendorId, jobId, category, amount, taxAmount, cardId, date
    """
    receipt_id = str(uuid4())

    # S3 object key, grouped by user
    s3_key = f"{DEMO_USER_ID}/receipts/{receipt_id}-{file.filename}"

    # Upload to S3
    s3_client.upload_fileobj(
        file.file,
        config.S3_BUCKET_RECEIPTS,
        s3_key,
        ExtraArgs={"ContentType": file.content_type or "application/octet-stream"},
    )

    # You can decide what you want to store as "imageUrl"
    image_url = f"s3://{config.S3_BUCKET_RECEIPTS}/{s3_key}"

    item = {
        "userId": DEMO_USER_ID,
        "receiptId": receipt_id,

        "vendorId": vendorId,
        "jobId": jobId,
        "category": category,
        "amount": amount,
        "taxAmount": taxAmount,
        "cardId": cardId,
        "date": date,

        "imageUrl": image_url,
        "rawText": None,          # OCR can fill this later
        "status": "UPLOADED",     # simple status flag for your OCR pipeline
    }

    table_receipts.put_item(Item=item)
    return item
