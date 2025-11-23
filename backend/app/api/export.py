# app/api/export.py

from fastapi import APIRouter, Response
from typing import Optional, List
import io
import csv

from app.core.aws import table_receipts

router = APIRouter(prefix="/export", tags=["export"])

DEMO_USER_ID = "demo-user"


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

    # 2) Simple in-Python date filtering (assuming ISO "YYYY-MM-DD")
    if startDate is not None:
        items = [r for r in items if r.get("date") is None or r["date"] >= startDate]
    if endDate is not None:
        items = [r for r in items if r.get("date") is None or r["date"] <= endDate]

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
        "imageUrl",
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
            r.get("imageUrl") or "",
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
