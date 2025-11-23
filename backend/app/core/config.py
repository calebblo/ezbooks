import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file when FastAPI starts (support both backend/.env and backend/app/.env)
_here = Path(__file__).resolve()
_root = _here.parents[2]  # backend/
_app_dir = _here.parents[1]  # backend/app/
load_dotenv(_root / ".env")       # !!!!!! load env from backend/.env
load_dotenv(_app_dir / ".env")    # !!!!!! load env from backend/app/.env

# // !!!!!! Allow configuring CORS origins for frontend access
_origins_raw = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = [o.strip() for o in _origins_raw.split(",")] if _origins_raw else ["*"]

AWS_REGION = os.getenv("AWS_REGION")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

S3_BUCKET_RECEIPTS = os.getenv("S3_BUCKET_RECEIPTS")

DDB_TABLE_VENDORS = os.getenv("DDB_TABLE_VENDORS")
DDB_TABLE_CARDS = os.getenv("DDB_TABLE_CARDS")
DDB_TABLE_JOBS = os.getenv("DDB_TABLE_JOBS")
DDB_TABLE_RECEIPTS = os.getenv("DDB_TABLE_RECEIPTS")
