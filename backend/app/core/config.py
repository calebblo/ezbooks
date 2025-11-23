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

# Notifications
NOTIFY_EMAIL = os.getenv("NOTIFY_EMAIL", "ezbooks021@gmail.com")
NOTIFY_FROM_EMAIL = os.getenv("NOTIFY_FROM_EMAIL", NOTIFY_EMAIL)
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes", "on")

# LLM verification
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_API_BASE = os.getenv("GEMINI_API_BASE", "https://generativelanguage.googleapis.com")
GEMINI_API_VERSION = os.getenv("GEMINI_API_VERSION", "v1")
