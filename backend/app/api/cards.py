from fastapi import APIRouter
from pydantic import BaseModel, constr
from typing import List, Optional
from uuid import uuid4

from app.core.aws import table_cards   # same pattern as table_vendors
                                        # (PDF shows vendors using table_vendors: L40-L41)
router = APIRouter(prefix="/cards", tags=["cards"])

DEMO_USER_ID = "demo-user"


class CardIn(BaseModel):
    nickname: str
    last4: constr(min_length=4, max_length=4)
    brand: str
    defaultCategory: Optional[str] = None
    isActive: bool = True


class CardOut(CardIn):
    cardId: str
    userId: str


@router.get("/", response_model=List[CardOut])
def list_cards():
    """
    Return all cards for the demo user.
    Mirrors vendor list (PDF L60-L71).
    """
    resp = table_cards.query(
        KeyConditionExpression="userId = :uid",
        ExpressionAttributeValues={":uid": DEMO_USER_ID},
    )
    return resp.get("Items", [])


@router.post("/", response_model=CardOut)
def create_card(card: CardIn):
    """
    Create a new card for the demo user.
    Mirrors vendor create (PDF L77-L95).
    """
    card_id = str(uuid4())

    item = {
        "userId": DEMO_USER_ID,
        "cardId": card_id,
        "nickname": card.nickname,
        "last4": card.last4,
        "brand": card.brand,
        "defaultCategory": card.defaultCategory,
        "isActive": card.isActive,
    }

    table_cards.put_item(Item=item)
    return item
