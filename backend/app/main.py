from fastapi import FastAPI
from app.api.vendors import router as vendors_router

app = FastAPI(title="EZBooks Backend")

# include the /vendors routes
app.include_router(vendors_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}