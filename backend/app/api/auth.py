from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import time
from datetime import datetime, timedelta
from app.core.aws import table_users, table_receipts
from boto3.dynamodb.conditions import Key

router = APIRouter(prefix="/auth", tags=["auth"])

DEMO_USER_ID = "demo-user"
FREE_LIMIT = 20

class UserOut(BaseModel):
    userId: str
    tier: str  # FREE, PRO, ENTERPRISE
    usage: int
    limit: Optional[int]
    isTrialActive: bool = False # Deprecated but kept for frontend compat if needed
    daysRemaining: int = 0

@router.get("/me", response_model=UserOut)
def get_current_user():
    # Check if user exists
    resp = table_users.get_item(Key={"userId": DEMO_USER_ID})
    user = resp.get("Item")
    
    current_time = int(time.time())
    
    if not user:
        # Create new user (default to FREE)
        user = {
            "userId": DEMO_USER_ID,
            "tier": "FREE",
            "created": current_time
        }
        table_users.put_item(Item=user)
    
    tier = user.get("tier", "FREE")
    
    # Use persistent usage counter from user record
    # Default to 0 if not present
    usage = int(user.get("monthlyUsage", 0))
    
    limit = FREE_LIMIT if tier == "FREE" else None
    
    return UserOut(
        userId=DEMO_USER_ID,
        tier=tier,
        usage=usage,
        limit=limit,
        isTrialActive=True, # Always true for now to avoid blocking
        daysRemaining=30
    )
