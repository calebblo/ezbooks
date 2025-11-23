from fastapi import FastAPI
from app.api.vendors import router as vendors_router
from app.api.cards import router as cards_router
from app.api.jobs import router as jobs_router
from app.api.receipts import router as receipts_router
from app.api.export import router as export_router
from app.api.ocr import router as ocr_router

app = FastAPI(title="EZBooks Backend")

# include the /vendors routes
app.include_router(vendors_router)
app.include_router(cards_router)
app.include_router(jobs_router)
app.include_router(receipts_router)
app.include_router(export_router)
app.include_router(ocr_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}