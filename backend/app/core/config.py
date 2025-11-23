import os
from dotenv import load_dotenv

# Load .env file when FastAPI starts
load_dotenv()

AWS_REGION = os.getenv("AWS_REGION")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

S3_BUCKET_RECEIPTS = os.getenv("S3_BUCKET_RECEIPTS")

DDB_TABLE_VENDORS = os.getenv("DDB_TABLE_VENDORS")
DDB_TABLE_CARDS = os.getenv("DDB_TABLE_CARDS")
DDB_TABLE_JOBS = os.getenv("DDB_TABLE_JOBS")
DDB_TABLE_RECEIPTS = os.getenv("DDB_TABLE_RECEIPTS")
