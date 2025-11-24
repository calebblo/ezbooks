import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env files when FastAPI starts (supports backend/.env and backend/app/.env)
_here = Path(__file__).resolve()
_root = _here.parents[2]  # backend/
_app_dir = _here.parents[1]  # backend/app/
load_dotenv(_root / ".env")
load_dotenv(_app_dir / ".env")

# CORS
_origins_raw = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = [o.strip() for o in _origins_raw.split(",")] if _origins_raw else ["*"]

# AWS
AWS_REGION = os.getenv("AWS_REGION")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

# S3 + Dynamo
S3_BUCKET_RECEIPTS = os.getenv("S3_BUCKET_RECEIPTS")
S3_REGION = os.getenv("S3_REGION", AWS_REGION)  # allow bucket in a different region

DDB_TABLE_VENDORS = os.getenv("DDB_TABLE_VENDORS")
DDB_TABLE_CARDS = os.getenv("DDB_TABLE_CARDS")
DDB_TABLE_JOBS = os.getenv("DDB_TABLE_JOBS")
DDB_TABLE_RECEIPTS = os.getenv("DDB_TABLE_RECEIPTS")
DDB_TABLE_CATEGORIES = os.getenv("DDB_TABLE_CATEGORIES", "EzBooks-Categories")
DDB_TABLE_USERS = os.getenv("DDB_TABLE_USERS", "EzBooks-Users")
