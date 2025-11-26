"""
Authentication endpoints for Supabase integration.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from app.core.aws import table_users
from app.core.auth_utils import get_current_user, User

router = APIRouter(prefix="/auth", tags=["auth"])

FREE_LIMIT = 20


class UserOut(BaseModel):
    """User profile response"""
    userId: str
    email: str
    tier: str
    usage: int
    limit: Optional[int]
    created: int


@router.get("/me", response_model=UserOut)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Get the current authenticated user's profile.
    
    - In development mode (no JWT secret): Returns demo user automatically
    - In production mode (JWT secret configured): Requires valid Supabase JWT token
    """
    tier = current_user.tier
    usage = current_user.monthlyUsage
    limit = FREE_LIMIT if tier == "FREE" else None
    
    # Fetch full user data from DynamoDB
    resp = table_users.get_item(Key={"userId": current_user.userId})
    user_item = resp.get("Item", {})
    
    return UserOut(
        userId=current_user.userId,
        email=current_user.email,
        tier=tier,
        usage=usage,
        limit=limit,
        created=user_item.get("created", 0)
    )
