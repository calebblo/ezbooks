from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from uuid import uuid4

from app.core.aws import table_vendors

router = APIRouter(prefix="/vendors", tags=["vendors"])

# for now we hard-code a demo user
DEMO_USER_ID = "demo-user"


class VendorIn(BaseModel):
    name: str
    defaultCategory: Optional[str] = None
    defaultCardId: Optional[str] = None


class VendorOut(VendorIn):
    vendorId: str
    userId: str
    matchKeywords: list[str]


@router.get("/", response_model=List[VendorOut])
def list_vendors():
    """
    Return all vendors for the demo user.
    """
    # DynamoDB query: all items with this userId
    resp = table_vendors.query(
        KeyConditionExpression="userId = :uid",
        ExpressionAttributeValues={":uid": DEMO_USER_ID},
    )
    items = resp.get("Items", [])
    return items


@router.post("/", response_model=VendorOut)
def create_vendor(vendor: VendorIn):
    """
    Create a new vendor for the demo user.
    """
    vendor_id = str(uuid4())

    item = {
        "userId": DEMO_USER_ID,
        "vendorId": vendor_id,
        "name": vendor.name,
        "defaultCategory": vendor.defaultCategory,
        "defaultCardId": vendor.defaultCardId,
        # naive keyword list for later fuzzy matching
        "matchKeywords": [vendor.name.upper()],
    }

    table_vendors.put_item(Item=item)
    return item
