from typing import Optional, Dict, Any
import boto3
import re
import os
import base64
import json
import requests
from .vendor_card_matcher import match_vendor, match_card
from app.core import config

AWS_REGION = config.AWS_REGION
S3_BUCKET_RECEIPTS = config.S3_BUCKET_RECEIPTS
GEMINI_API_KEY = config.GEMINI_API_KEY
GEMINI_MODEL = config.GEMINI_MODEL
GEMINI_API_BASE = config.GEMINI_API_BASE
GEMINI_API_VERSION = config.GEMINI_API_VERSION

textract = boto3.client("textract", region_name=AWS_REGION)
s3 = boto3.client("s3", region_name=AWS_REGION)

# Map common taglines/phrases to their actual vendor names to correct OCR
KNOWN_VENDOR_HINTS = {
    "DELIVER HOW": "Home Depot",
    "HOW DOERS GET MORE DONE": "Home Depot",
    "HOW DOERS": "Home Depot",
    "GET MORE DONE": "Home Depot",
    "THE HOME DEPOT": "Home Depot",
    "HOME DEPOT": "Home Depot",
}


# ------------------------------------------
# 1. Extract ALL text (raw OCR)
# ------------------------------------------
def extract_raw_text_from_textract_bytes(data: bytes) -> str:
    """Use Textract on raw image bytes instead of S3Object."""
    response = textract.detect_document_text(
        Document={"Bytes": data}
    )
    lines = []
    for block in response.get("Blocks", []):
        if block.get("BlockType") == "LINE":
            lines.append(block.get("Text", ""))
    return "\n".join(lines)





# ------------------------------------------
# 2. Extract Vendor, Total, Date using AnalyzeExpense
# ------------------------------------------
def extract_structured_fields_bytes(data: bytes):
    """Use AnalyzeExpense on raw image bytes."""
    response = textract.analyze_expense(
        Document={"Bytes": data}
    )

    vendor = None
    total_amount = None
    date = None
    tax_amount = None

    for doc in response.get("ExpenseDocuments", []):
        for field in doc.get("SummaryFields", []):
            field_type = field.get("Type", {}).get("Text", "")
            value = field.get("ValueDetection", {}).get("Text", "")

            t = field_type.upper()

            if t == "VENDOR_NAME":
                vendor = value
            elif t == "TOTAL":
                m = re.search(r"\d+\.\d{2}", value.replace(",", ""))
                total_amount = m.group(0) if m else value
            elif t in ("INVOICE_RECEIPT_DATE", "INVOICE_DATE"):
                date = value
            elif t in ("TAX", "TOTAL_TAX") and value:
                # Textract sometimes gives total tax directly
                try:
                    tax_amount = float(value)
                except ValueError:
                    pass

    return {
        "vendor": vendor,
        "amount": total_amount,
        "date": date,
        "taxAmount": tax_amount
    }




def parse_receipt_from_bytes(data: bytes):
    """Main OCR entry point using BYTE DATA only."""
    raw_text = extract_raw_text_from_textract_bytes(data)
    fields = extract_structured_fields_bytes(data)

    vendor = normalize_vendor(fields.get("vendor") or extract_vendor(raw_text), raw_text)
    vendor = verify_vendor_with_gemini(vendor, raw_text)
    amount = fields.get("amount") or extract_amount(raw_text)
    date = fields.get("date") or extract_date(raw_text)
    tax_amount = extract_tax_amount(raw_text)
    card_last4 = extract_card_last4(raw_text)

    vendor_suggestion = match_vendor(vendor)
    card_match = match_card(card_last4)

    return {
        "rawText": raw_text,
        "vendorText": vendor,
        "amount": amount,
        "taxAmount": tax_amount,
        "date": date,
        "cardLast4": card_last4,
        "vendorSuggestion": vendor_suggestion,
        "cardMatch": card_match,
    }



# ------------------------------------------
# 3. FALLBACKS (regex / heuristics)
# ------------------------------------------
def normalize_vendor(vendor: Optional[str], raw_text: str) -> Optional[str]:
    """
    Correct common tagline-based mis-reads (e.g., Home Depot slogan).
    """
    if vendor:
        upper = vendor.upper()
        for hint, name in KNOWN_VENDOR_HINTS.items():
            if hint in upper:
                return name
    upper_text = raw_text.upper()
    compressed = re.sub(r"\s+", " ", upper_text)
    stripped = re.sub(r"[^A-Z0-9 ]+", " ", compressed)
    for hint, name in KNOWN_VENDOR_HINTS.items():
        if hint in upper_text or hint in compressed or hint in stripped:
            return name
    return vendor


def verify_vendor_with_gemini(vendor: Optional[str], raw_text: str) -> Optional[str]:
    """
    Ask Gemini to pick the vendor name from the OCR text.
    Falls back silently if Gemini is not configured or errors.
    """
    if not GEMINI_API_KEY:
        return vendor

    prompt = (
        "Given the receipt text below, return only the merchant/vendor name as plain text. "
        "If unsure, return UNKNOWN. Do not include any other text."
    )
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {"text": raw_text[:5000]},
                ]
            }
        ]
    }

    url = (
        f"{GEMINI_API_BASE.rstrip('/')}/{GEMINI_API_VERSION}/models/"
        f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    )

    try:
        resp = requests.post(url, json=payload, timeout=15)
        if resp.status_code >= 400:
            return vendor
        body = resp.json()
        candidates = body.get("candidates") or []
        if not candidates:
            return vendor
        parts = candidates[0].get("content", {}).get("parts") or []
        text_out = ""
        for part in parts:
            if "text" in part:
                text_out += part["text"]
        cleaned = text_out.strip().strip('"').strip()
        if cleaned and cleaned.upper() != "UNKNOWN":
            return normalize_vendor(cleaned, raw_text)
    except Exception as exc:  # pragma: no cover
        print(f"Gemini vendor verification failed: {exc}")
    return vendor


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

def extract_tax_amount(raw_text: str) -> Optional[float]:
    """
    Try to find tax amounts like:
      - 'SALES TAX 0.61'
      - 'HST 0.91'
      - 'Tax 0.78'
      - 'GST (5%)\\n14.35' / 'PST (7%)\\n20.09'
    Returns the SUM of all tax lines if any are found.
    """
    lines = raw_text.splitlines()
    tokens = ("TAX", "GST", "HST", "PST")
    amounts: list[float] = []

    for i, line in enumerate(lines):
        upper = line.upper()
        if any(tok in upper for tok in tokens):
            # look for numbers on this line AND the next line (for GST\n14.35 style)
            candidates = [line]
            if i + 1 < len(lines):
                candidates.append(lines[i + 1])

            for text in candidates:
                for m in re.findall(r"\d+\.\d{2}", text):
                    try:
                        amounts.append(float(m))
                    except ValueError:
                        pass

    if not amounts:
        return None

    # sum GST+PST, or single TAX, etc.
    return round(sum(amounts), 2)



# ------------------------------------------
# 4. MAIN PUBLIC FUNCTION
# ------------------------------------------
def parse_receipt_from_s3(bucket: str, key: str) -> Dict[str, Optional[Any]]:
    """
    Public function used by the FastAPI /ocr endpoint.

    It:
      1. Downloads the file from S3
      2. Feeds raw bytes into parse_receipt_from_bytes
      3. Returns the same dict structure (including taxAmount)
    """
    obj = s3.get_object(Bucket=bucket, Key=key)
    data: bytes = obj["Body"].read()

    return parse_receipt_from_bytes(data)
