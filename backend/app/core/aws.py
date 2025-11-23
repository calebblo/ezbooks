import boto3
from . import config

# Create a boto3 session using our .env credentials
session = boto3.Session(
    aws_access_key_id=config.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
    region_name=config.AWS_REGION,
)

# AWS clients
s3_client = session.client("s3")
dynamodb = session.resource("dynamodb")

# DynamoDB tables
table_vendors = dynamodb.Table(config.DDB_TABLE_VENDORS)
table_cards = dynamodb.Table(config.DDB_TABLE_CARDS)
table_jobs = dynamodb.Table(config.DDB_TABLE_JOBS)
table_receipts = dynamodb.Table(config.DDB_TABLE_RECEIPTS)
