from typing import Optional, Dict, Any
import boto3
import re
import os
from .vendor_card_matcher import match_vendor, match_card
from app.core import config

try:
    from google import genai
except ImportError:
    genai = None

AWS_REGION = config.AWS_REGION
S3_BUCKET_RECEIPTS = config.S3_BUCKET_RECEIPTS

textract = boto3.client("textract", region_name=AWS_REGION)
s3 = boto3.client("s3", region_name=AWS_REGION)

# Optional Gemini client for vendor validation
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if genai and GEMINI_API_KEY else None
gemini_enabled = bool(gemini_client)


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

    vendor = fields.get("vendor") or extract_vendor(raw_text)
    if vendor:
        vendor = validate_vendor_name(vendor)  # drop invalid names like slogans
    amount = fields.get("amount") or extract_amount(raw_text)
    date = fields.get("date") or extract_date(raw_text)
    tax_amount = extract_tax_amount(raw_text)
    card_last4 = extract_card_last4(raw_text)

    vendor_suggestion = match_vendor(vendor)
    card_match = match_card(card_last4)

    return {
        "rawText": raw_text,
        "vendorText": vendor,  # internal use; not persisted
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
def extract_vendor(raw_text: str) -> str:
    """Fallback: first non-empty line, skipping marketing tags like 'DELIVER HOW'."""
    for line in raw_text.split("\n"):
        candidate = line.strip()
        if not candidate:
            continue
        upper = candidate.upper()
        if upper in ("DELIVER HOW", "HOW DOERS GET MORE DONE"):
            continue
        return candidate
    return ""


def validate_vendor_name(name: str) -> Optional[str]:
    """
    Use Gemini (if configured) to validate that a candidate string looks like a real business name.
    Returns the name if it passes, otherwise None.
    Falls back to simple heuristics if Gemini is unavailable.
    """
    if not name:
        return None

    cleaned = name.strip()
    upper = cleaned.upper()
    if upper in ("DELIVER HOW", "HOW DOERS GET MORE DONE"):
        return None

    # Heuristic: reject very short strings and obvious non-names
    if len(cleaned) < 3:
        return None

    # If Gemini is available, ask it to validate
    global gemini_enabled
    if gemini_client and gemini_enabled:
        try:
            prompt = (
                "Decide if the following string is a real business/store name from a receipt. "
                "Respond with only YES or NO.\n\n"
                f"Name: {cleaned}"
            )
            resp = gemini_client.models.generate_content(
                model="gemini-1.5-flash",
                contents=[prompt],
            )
            answer = (getattr(resp, "text", "") or "").strip().upper()
            if answer.startswith("YES"):
                return cleaned
            return None
        except Exception as e:
            print(f"[Gemini Vendor Validation] Error: {e}")
            gemini_enabled = False  # disable further calls on failure

    # If no Gemini or failure, return the cleaned name
    return cleaned


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
