from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.api.vendors import router as vendors_router
from app.api.cards import router as cards_router
from app.api.jobs import router as jobs_router
from app.api.receipts import router as receipts_router
from app.api.export import router as export_router
from app.api.ocr import router as ocr_router
from app.api.categories import router as categories_router
from app.api.auth import router as auth_router
from app.core import config

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="EZBooks Backend")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Basic CORS so frontend can call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# include the /vendors routes
app.include_router(vendors_router)
app.include_router(cards_router)
app.include_router(jobs_router)
app.include_router(receipts_router)
app.include_router(export_router)
app.include_router(ocr_router)
app.include_router(categories_router)
app.include_router(auth_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
