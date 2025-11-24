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
    format: str = "csv",
):
    """
    Export receipts as CSV or PDF for the demo user.
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

    if format == "pdf":
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas

        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        y = height - 40
        p.setFont("Helvetica-Bold", 16)
        p.drawString(30, y, "EzBooks Receipt Export")
        y -= 30

        p.setFont("Helvetica", 10)
        headers = ["Date", "Vendor", "Category", "Amount", "Tax", "Status"]
        x_positions = [30, 110, 200, 300, 380, 460]

        for i, h in enumerate(headers):
            p.drawString(x_positions[i], y, h)
        
        y -= 20
        p.line(30, y+15, 550, y+15)

        for r in items:
            if y < 50:
                p.showPage()
                y = height - 40
            
            p.drawString(x_positions[0], y, str(r.get("date") or ""))
            p.drawString(x_positions[1], y, str(r.get("vendorId") or "")[:15])
            p.drawString(x_positions[2], y, str(r.get("category") or "")[:15])
            p.drawString(x_positions[3], y, str(r.get("amount") or ""))
            p.drawString(x_positions[4], y, str(r.get("taxAmount") or ""))
            p.drawString(x_positions[5], y, str(r.get("status") or ""))
            y -= 15

        p.save()
        pdf_data = buffer.getvalue()
        buffer.close()

        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={
                "Content-Disposition": 'attachment; filename="ezbooks-export.pdf"'
            },
        )

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
