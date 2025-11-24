import boto3
import os
from uuid import uuid4
from dotenv import load_dotenv

load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
DDB_TABLE_RECEIPTS = os.getenv("DDB_TABLE_RECEIPTS")
DDB_TABLE_VENDORS = os.getenv("DDB_TABLE_VENDORS")
DEMO_USER_ID = "demo-user"

session = boto3.Session(
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
)
dynamodb = session.resource("dynamodb")
table_receipts = dynamodb.Table(DDB_TABLE_RECEIPTS)
table_vendors = dynamodb.Table(DDB_TABLE_VENDORS)

def backfill_vendors():
    print("Starting vendor backfill...")
    
    # 1. Get all receipts
    resp = table_receipts.query(
        KeyConditionExpression="userId = :uid",
        ExpressionAttributeValues={":uid": DEMO_USER_ID}
    )
    receipts = resp.get("Items", [])
    print(f"Found {len(receipts)} receipts.")

    # 2. Get all existing vendors
    v_resp = table_vendors.query(
        KeyConditionExpression="userId = :uid",
        ExpressionAttributeValues={":uid": DEMO_USER_ID}
    )
    existing_vendors = v_resp.get("Items", [])
    existing_names = {v["name"].lower() for v in existing_vendors}
    print(f"Found {len(existing_names)} existing vendors.")

    # 3. Find missing vendors
    added_count = 0
    for r in receipts:
        vendor_name = r.get("vendorId")
        if not vendor_name:
            continue
            
        # Clean up name (remove newlines etc if present)
        vendor_name = vendor_name.strip()
        
        if vendor_name.lower() not in existing_names:
            print(f"Adding missing vendor: {vendor_name}")
            new_id = str(uuid4())
            table_vendors.put_item(Item={
                "userId": DEMO_USER_ID,
                "vendorId": new_id,
                "name": vendor_name,
                "matchKeywords": [vendor_name.upper()]
            })
            existing_names.add(vendor_name.lower())
            added_count += 1

    print(f"Backfill complete. Added {added_count} new vendors.")

if __name__ == "__main__":
    backfill_vendors()
