from typing import Optional, Dict, Any, List
import boto3
import re
import os
import mimetypes

from google import genai
from google.genai import types

# Assuming these imports exist in your project structure
from .vendor_card_matcher import match_vendor, match_card
from app.core import config

# --------------------------------------------------------------------
# AWS + config
# --------------------------------------------------------------------

AWS_REGION = config.AWS_REGION
S3_BUCKET_RECEIPTS = config.S3_BUCKET_RECEIPTS

textract = boto3.client("textract", region_name=AWS_REGION)
s3 = boto3.client("s3", region_name=AWS_REGION)


# --------------------------------------------------------------------
# 1. RAW TEXT (Textract)
# --------------------------------------------------------------------

def extract_raw_text_from_textract(bucket: str, key: str) -> str:
    """
    Run Textract on a receipt stored in S3 and return all text as a single string.
    """
    response = textract.detect_document_text(
        Document={"S3Object": {"Bucket": bucket, "Name": key}}
    )

    lines: List[str] = []
    for block in response.get("Blocks", []):
        if block.get("BlockType") == "LINE":
            text = block.get("Text")
            if text:
                lines.append(text)

    return "\n".join(lines)


def extract_raw_text_from_textract_bytes(data: bytes) -> str:
    """
    Run Textract on raw image/PDF bytes and return all text.
    """
    response = textract.detect_document_text(
        Document={"Bytes": data}
    )

    lines: List[str] = []
    for block in response.get("Blocks", []):
        if block.get("BlockType") == "LINE":
            text = block.get("Text")
            if text:
                lines.append(text)

    return "\n".join(lines)


# --------------------------------------------------------------------
# 2. STRUCTURED FIELDS (Textract AnalyzeExpense)
# --------------------------------------------------------------------

def extract_structured_fields_from_s3(bucket: str, key: str) -> Dict[str, Any]:
    """
    Use Textract AnalyzeExpense on S3 object and extract key fields like vendor,
    amount, and date when available.
    """
    response = textract.analyze_expense(
        Document={"S3Object": {"Bucket": bucket, "Name": key}}
    )
    return _extract_fields_from_expense_response(response)


def extract_structured_fields_from_bytes(data: bytes) -> Dict[str, Any]:
    """
    Use Textract AnalyzeExpense on raw bytes and extract key fields.
    """
    response = textract.analyze_expense(
        Document={"Bytes": data}
    )
    return _extract_fields_from_expense_response(response)


def _extract_fields_from_expense_response(response: Dict[str, Any]) -> Dict[str, Any]:
    """
    Helper to walk Textract AnalyzeExpense response and pull out common fields.
    Only uses Textract's semantic fields, not regex/heuristics.
    """
    fields: Dict[str, Any] = {}

    for doc in response.get("ExpenseDocuments", []):
        for field in doc.get("SummaryFields", []):
            type_info = field.get("Type", {}).get("Text", "")
            value = field.get("ValueDetection", {}).get("Text", "")

            if not value:
                continue

            t = type_info.upper()
            if t in ("VENDOR_NAME", "RESTAURANT_NAME", "SUPPLIER_NAME") and "vendor" not in fields:
                fields["vendor"] = value
            elif t in ("TOTAL", "AMOUNT_DUE", "INVOICE_TOTAL", "GRAND_TOTAL") and "amount" not in fields:
                fields["amount"] = _safe_parse_amount(value)
            elif t in ("INVOICE_DATE", "RECEIPT_DATE", "TRANSACTION_DATE") and "date" not in fields:
                fields["date"] = value

    return fields


# --------------------------------------------------------------------
# 3. Regex-based fallback extractors
# --------------------------------------------------------------------

AMOUNT_REGEX = re.compile(r"(?:TOTAL|AMOUNT DUE|BALANCE DUE)[^\d]*([\d,]+\.\d{2})", re.IGNORECASE)
GENERIC_AMOUNT_REGEX = re.compile(r"([\d,]+\.\d{2})")
DATE_REGEX = re.compile(
    r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})"
)
CARD_LAST4_REGEX = re.compile(r"(?:\*{4,}|X{4,})\s*([0-9]{4})")


def extract_vendor(raw_text: str) -> Optional[str]:
    """
    Very simple heuristic:
      - Take the first non-empty line that is not obviously a date or amount.
    """
    for line in raw_text.splitlines():
        clean = line.strip()
        if not clean:
            continue

        if AMOUNT_REGEX.search(clean) or GENERIC_AMOUNT_REGEX.search(clean):
            continue
        if DATE_REGEX.search(clean):
            continue

        # Skip lines that look like 'TOTAL', 'SUBTOTAL', etc.
        if re.search(r"(TOTAL|SUBTOTAL|TAX|AMOUNT DUE)", clean, re.IGNORECASE):
            continue

        return clean

    return None


def _safe_parse_amount(text: str) -> Optional[float]:
    try:
        clean = text.replace(",", "").strip()
        return float(clean)
    except Exception:
        return None


def extract_amount(raw_text: str) -> Optional[float]:
    # Try label-based pattern first
    m = AMOUNT_REGEX.search(raw_text)
    if m:
        amt = _safe_parse_amount(m.group(1))
        if amt is not None:
            return amt

    # Fallback: largest monetary-looking number
    candidates = [m.group(1) for m in GENERIC_AMOUNT_REGEX.finditer(raw_text)]
    best_val = None
    for c in candidates:
        v = _safe_parse_amount(c)
        if v is None:
            continue
        if best_val is None or v > best_val:
            best_val = v

    return best_val


def extract_date(raw_text: str) -> Optional[str]:
    m = DATE_REGEX.search(raw_text)
    return m.group(1) if m else None


def extract_tax_amount(raw_text: str) -> Optional[float]:
    """
    Optional: If you want to try to pull GST/PST/VAT separately, add more regex here.
    For now, we just look for a line with 'TAX' and a numeric value.
    """
    tax_regex = re.compile(r"TAX[^\d]*([\d,]+\.\d{2})", re.IGNORECASE)
    m = tax_regex.search(raw_text)
    if not m:
        return None
    return _safe_parse_amount(m.group(1))


def extract_card_last4(raw_text: str) -> Optional[str]:
    m = CARD_LAST4_REGEX.search(raw_text)
    if not m:
        return None
    return m.group(1)


# --------------------------------------------------------------------
# 4. Gemini Vision: Vendor from Image (fallback)
# --------------------------------------------------------------------

def identify_vendor_with_ai_from_image(
    data: bytes,
    content_type: Optional[str] = None,
    filename: Optional[str] = None,
) -> Optional[str]:
    """
    Use Gemini Vision to identify the vendor/store name from the receipt image file
    when Textract-based parsing cannot determine it.

    Returns a plain vendor name string, or None if anything fails.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        # Fail silently; we don't want vendor extraction to crash if AI key is missing
        return None

    try:
        client = genai.Client(api_key=api_key)

        # Try to pick a best-effort mime type from content_type or filename
        guessed_mime = content_type
        if not guessed_mime and filename:
            guessed_mime, _ = mimetypes.guess_type(filename)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(
                    data=data,
                    mime_type=guessed_mime or "application/octet-stream",
                ),
                (
                    "You are an expert at understanding receipts. "
                    "From this receipt image, identify the vendor/store name. "
                    "Return ONLY the vendor name, no extra words."
                ),
            ],
        )

        text = (getattr(response, "text", None) or "").strip()
        if not text:
            return None

        # Just take the first line if Gemini adds anything extra
        vendor_line = text.splitlines()[0].strip()
        return vendor_line or None

    except Exception as e:
        # Log and ignore AI errors; don't break the pipeline
        print(f"[Gemini Vendor Detection] Error: {e}")
        return None


# --------------------------------------------------------------------
# 5. High-level parse functions (MAIN ENTRY POINTS)
# --------------------------------------------------------------------

def parse_receipt_from_bytes(
    data: bytes,
    content_type: Optional[str] = None,
    filename: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Main OCR entry point using BYTE DATA only.

    1. Use Textract to get raw text.
    2. Use Textract AnalyzeExpense to get structured fields (vendor, amount, date).
    3. Fallback to regex-based extraction for missing fields.
    4. If vendor is still missing, call Gemini Vision to identify the vendor by logo/header.
    5. Use DynamoDB matching to suggest a known vendor + known card.
    """
    raw_text = extract_raw_text_from_textract_bytes(data)
    fields = extract_structured_fields_from_bytes(data)

    # 1. Try to get vendor from Textract fields OR Regex on raw text
    # NOTE: Temporarily skip Textract/regex vendor to test Gemini-only flow
    # vendor = fields.get("vendor") or extract_vendor(raw_text)
    vendor = None  # !!!!!! Gemini-only vendor detection for testing

    amount = fields.get("amount") or extract_amount(raw_text)
    date = fields.get("date") or extract_date(raw_text)
    tax_amount = extract_tax_amount(raw_text)
    card_last4 = extract_card_last4(raw_text)

    # 2. AI FALLBACK: If Textract/Regex failed to find a vendor, use the Image Bytes
    if not vendor:
        ai_vendor = identify_vendor_with_ai_from_image(data, content_type, filename)
        if ai_vendor:
            vendor = ai_vendor

    vendor_suggestion = match_vendor(vendor) if vendor else None
    card_match = match_card(card_last4) if card_last4 else None

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


def parse_receipt_from_s3(bucket: str, key: str) -> Dict[str, Any]:
    """
    Convenience wrapper: load from S3, then call parse_receipt_from_bytes.
    """
    obj = s3.get_object(Bucket=bucket, Key=key)
    data = obj["Body"].read()
    content_type = obj.get("ContentType") or None  # best-effort pass-through
    return parse_receipt_from_bytes(data, content_type, filename=key)
