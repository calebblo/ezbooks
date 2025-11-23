# backend/app/api/ocr.py

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Any

from parser.receipt_textract import parse_receipt_from_s3  # the function you showed

from app.core import config

router = APIRouter(prefix="/ocr", tags=["ocr"])

class OcrResult(BaseModel):
    rawText: str
    vendorText: Optional[str]
    amount: Optional[float]
    taxAmount: Optional[float]
    date: Optional[str]
    cardLast4: Optional[str]
    vendorSuggestion: Optional[Any]
    cardMatch: Optional[Any]


@router.get("/parse-from-s3")
def parse_from_s3(key: str):
    """
    Call this AFTER you've uploaded a receipt via /receipts/.

    Example:
       GET /ocr/parse-from-s3?key=demo-user/receipts/1234-file.png
    """
    bucket = config.S3_BUCKET_RECEIPTS
    result = parse_receipt_from_s3(bucket, key)
    return OcrResult(**result)
