# backend/app/api/categories.py

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from uuid import uuid4

from app.core.aws import table_categories

router = APIRouter(prefix="/categories", tags=["categories"])

DEMO_USER_ID = "demo-user"


class CategoryIn(BaseModel):
    name: str
    description: Optional[str] = None


class CategoryOut(CategoryIn):
    categoryId: str
    userId: str


@router.get("/", response_model=List[CategoryOut])
def list_categories():
    """Return all categories for the demo user."""
    resp = table_categories.query(
        KeyConditionExpression="userId = :uid",
        ExpressionAttributeValues={":uid": DEMO_USER_ID},
    )
    return resp.get("Items", [])


@router.post("/", response_model=CategoryOut)
def create_category(category: CategoryIn):
    """Create a new category for the demo user."""
    category_id = str(uuid4())

    item = {
        "userId": DEMO_USER_ID,
        "categoryId": category_id,
        "name": category.name,
        "description": category.description,
    }

    table_categories.put_item(Item=item)
    return item
