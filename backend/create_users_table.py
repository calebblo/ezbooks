import boto3
import os
from dotenv import load_dotenv

# Load env vars
load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
DDB_TABLE_USERS = os.getenv("DDB_TABLE_USERS", "EzBooks-Users")

def create_table():
    session = boto3.Session(
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION,
    )
    dynamodb = session.resource("dynamodb")

    print(f"Creating table: {DDB_TABLE_USERS}...")
    try:
        table = dynamodb.create_table(
            TableName=DDB_TABLE_USERS,
            KeySchema=[
                {"AttributeName": "userId", "KeyType": "HASH"},  # Partition key
            ],
            AttributeDefinitions=[
                {"AttributeName": "userId", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )
        print("Table status:", table.table_status)
        print("Waiting for table to exist...")
        table.wait_until_exists()
        print(f"Table {DDB_TABLE_USERS} created successfully!")
    except Exception as e:
        print(f"Error creating table: {e}")

if __name__ == "__main__":
    create_table()
