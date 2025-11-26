# app/api/export.py

from fastapi import APIRouter, Response
from typing import Optional, List
from datetime import datetime
import io
import csv

from app.core.aws import table_receipts

router = APIRouter(prefix="/export", tags=["export"])

DEMO_USER_ID = "demo-user"

def _normalize_date(date_str: Optional[str]) -> Optional[str]:
    if not date_str:
        return None
    value = str(date_str).strip()
    formats = [
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%Y.%m.%d",
        "%m/%d/%y",
        "%m-%d-%y",
        "%b %d, %Y",
        "%B %d, %Y",
        "%m/%d/%Y",
        "%d %b %Y",
        "%d %B %Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(value).date().isoformat()
    except Exception:
        return None


@router.get("/", response_class=Response)
def export_receipts(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
):
    """
    Export receipts as CSV for the demo user.

    For now:
      - pulls all receipts for DEMO_USER_ID
      - (optionally) filters by date string if present
      - returns a CSV with basic fields
    """
    # 1) Get all receipts for this user
    resp = table_receipts.query(
        KeyConditionExpression="userId = :uid",
        ExpressionAttributeValues={":uid": DEMO_USER_ID},
    )
    items: List[dict] = resp.get("Items", [])

    # 2) Normalize + filter. When a range is provided, receipts without a
    # parseable date are excluded to avoid misleading exports.
    if startDate is not None or endDate is not None:
        filtered = []
        for r in items:
            iso_date = _normalize_date(r.get("date"))
            if startDate and (iso_date is None or iso_date < startDate):
                continue
            if endDate and (iso_date is None or iso_date > endDate):
                continue
            filtered.append(r)
        items = filtered

    # 3) Build CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Header (you can tweak later)
    writer.writerow([
        "date",
        "vendorId",
        "category",
        "amount",
        "taxAmount",
        "cardId",
        "jobId",
        "status",
    ])

    for r in items:
        writer.writerow([
            r.get("date") or "",
            r.get("vendorId") or "",
            r.get("category") or "",
            r.get("amount") or "",
            r.get("taxAmount") or "",
            r.get("cardId") or "",
            r.get("jobId") or "",
            r.get("status") or "",
        ])

    csv_data = output.getvalue()
    output.close()

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="ezbooks-export.csv"'
        },
    )
