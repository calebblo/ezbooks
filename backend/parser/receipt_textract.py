from typing import Optional, Dict, Any
import boto3
import re
import os
from .vendor_card_matcher import match_vendor, match_card
from app.core import config

AWS_REGION = config.AWS_REGION
S3_BUCKET_RECEIPTS = config.S3_BUCKET_RECEIPTS

textract = boto3.client("textract", region_name=AWS_REGION)
s3 = boto3.client("s3", region_name=AWS_REGION)


# ------------------------------------------
# 1. Extract ALL text (raw OCR)
# ------------------------------------------
def extract_raw_text_from_textract(bucket: str, key: str) -> str:
    response = textract.detect_document_text(
        Document={"S3Object": {"Bucket": bucket, "Name": key}}
    )

    lines = []
    for block in response.get("Blocks", []):
        if block.get("BlockType") == "LINE":
            lines.append(block.get("Text", ""))

    return "\n".join(lines)


# ------------------------------------------
# 2. Extract Vendor, Total, Date using AnalyzeExpense
# ------------------------------------------
def extract_structured_fields(bucket: str, key: str) -> Dict[str, Optional[str]]:
    response = textract.analyze_expense(
        Document={"S3Object": {"Bucket": bucket, "Name": key}}
    )

    vendor = None
    total_amount = None
    date = None

    for doc in response.get("ExpenseDocuments", []):
        for field in doc.get("SummaryFields", []):
            field_type = field.get("Type", {}).get("Text", "")
            value = field.get("ValueDetection", {}).get("Text", "")

            if field_type == "VENDOR_NAME":
                vendor = value
            elif field_type == "TOTAL":
                total_amount = value
            elif field_type in ("INVOICE_RECEIPT_DATE", "INVOICE_DATE"):
                date = value

    return {
        "vendor": vendor,
        "amount": total_amount,
        "date": date,
    }


# ------------------------------------------
# 3. FALLBACKS (regex / heuristics)
# ------------------------------------------
def extract_vendor(raw_text: str) -> str:
    """Fallback: first line usually the vendor."""
    return raw_text.split("\n")[0].strip()


def extract_date(raw_text: str) -> Optional[str]:
    patterns = [
        r"\b\d{1,2}/\d{1,2}/\d{2,4}\b",
        r"\b\d{4}-\d{1,2}-\d{1,2}\b",
        r"\b\d{1,2}-\d{1,2}-\d{2,4}\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, raw_text)
        if match:
            return match.group(0)
    return None


def extract_amount(raw_text: str) -> Optional[float]:
    """Find something like TOTAL 43.22 or $43.22"""
    match = re.search(r"(TOTAL|AMOUNT)[\s:]*\$?(\d+\.\d{2})", raw_text, re.IGNORECASE)
    if match:
        return float(match.group(2))

    # fallback: largest number that looks like money
    amounts = re.findall(r"\d+\.\d{2}", raw_text)
    if amounts:
        return float(max(amounts, key=lambda x: float(x)))

    return None


def extract_card_last4(raw_text: str) -> Optional[str]:
    match = re.search(r"(?:\*{4}|X{4})\s?(\d{4})", raw_text)
    if match:
        return match.group(1)
    return None


# ------------------------------------------
# 4. MAIN PUBLIC FUNCTION
# ------------------------------------------
def parse_receipt_from_s3(bucket: str, key: str) -> Dict[str, Optional[Any]]:
    raw_text = extract_raw_text_from_textract(bucket, key)
    fields = extract_structured_fields(bucket, key)

    vendor = fields.get("vendor") or extract_vendor(raw_text)
    amount = fields.get("amount") or extract_amount(raw_text)
    date = fields.get("date") or extract_date(raw_text)
    card_last4 = extract_card_last4(raw_text)

    vendor_suggestion = match_vendor(vendor)
    card_match = match_card(card_last4)

    return {
        "rawText": raw_text,
        "vendorText": vendor,
        "amount": amount,
        "date": date,
        "cardLast4": card_last4,
        "vendorSuggestion": vendor_suggestion,
        "cardMatch": card_match,
    }



# dynamodb = boto3.resource("dynamodb")
# VENDORS_TABLE = os.environ.get("VENDORS_TABLE", "Vendors")
# CARDS_TABLE = "Cards"

def get_vendor_suggestion(user_id: str, vendor_text : str) -> Optional[Dict[str, Any]]:
    if not vendor_text:
        return None

    normalized = vendor_text.lower().strip()

    resp = dynamodb.query(
        TableName = VENDORS_TABLE,
        KeyConditionExpression = "userId = :u",
        ExpressionAttributeValues = {":u": {"S" : user_id}}
    )

    vendors = resp.get("Items", [])
    if not vendors:
        return None

    best = None
    best_score = 0

    for v in vendors:
        name = v["name"]["S"].lower()

        if normalized == name:
            score = 3
        elif normalized in name:
            score = 2
        elif normalized[:5] in name:
            score = 1
        else:
            continue

        if score > best_score:
            best = v
            best_score = score


    if not best:
        return None

    return {
        "vendorId": best["vendorId"]["S"],
        "name": best["name"]["S"],
        "category": best.get("category", {}).get("S")
    }

