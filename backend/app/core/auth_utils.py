"""
Authentication utilities for Supabase JWT validation.
For MVP: JWT validation is optional. If SUPABASE_JWT_SECRET is not set,
a demo user will be used for development/testing.
"""
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from app.core import config
from app.core.aws import table_users
import time
from uuid import uuid4

# HTTP Bearer token scheme (optional)
security = HTTPBearer(auto_error=False)  # Don't auto-error if no token


class User(BaseModel):
    """User model for authentication"""
    userId: str
    email: str
    tier: str = "FREE"
    monthlyUsage: int = 0


# Demo user for development (when JWT is disabled)
DEMO_USER = User(
    userId="demo-user-123",
    email="demo@ezbooks.app",
    tier="FREE",
    monthlyUsage=0
)


def decode_supabase_token(token: str) -> dict:
    """
    Decode and validate a Supabase JWT token.
    
    Args:
        token: Supabase JWT token string
        
    Returns:
        Decoded token payload
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Check if JWT secret is configured
        if config.SUPABASE_JWT_SECRET.startswith("your-"):
            # Development mode - skip verification
            payload = jwt.decode(
                token,
                options={"verify_signature": False}
            )
            return payload
        
        # Production mode - verify signature
        payload = jwt.decode(
            token,
            config.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}  # Supabase doesn't use aud claim by default
        )
        return payload
    except JWTError as e:
        print(f"JWT decode error: {e}")
        raise credentials_exception


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> User:
    """
    Dependency to get the current authenticated user.
    
    For MVP: If no JWT secret is configured, returns a demo user.
    This allows the app to work without Supabase setup.
    
    Args:
        request: FastAPI request object
        credentials: HTTP Bearer credentials from request (optional)
        
    Returns:
        User object for the authenticated user
        
    Raises:
        HTTPException: If authentication fails (only in production mode)
    """
    # Development mode: No JWT secret configured
    if config.SUPABASE_JWT_SECRET.startswith("your-"):
        print("⚠️  Using demo user (JWT auth disabled)")
        
        # Ensure demo user exists in database
        resp = table_users.get_item(Key={"userId": DEMO_USER.userId})
        if not resp.get("Item"):
            # Create demo user
            table_users.put_item(Item={
                "userId": DEMO_USER.userId,
                "email": DEMO_USER.email,
                "tier": DEMO_USER.tier,
                "monthlyUsage": 0,
                "created": int(time.time())
            })
            print(f"Created demo user: {DEMO_USER.userId}")
        
        return DEMO_USER
    
    # Production mode: Require JWT token
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    
    try:
        payload = decode_supabase_token(token)
    except HTTPException:
        raise
    
    # Extract user ID from Supabase token (it's in 'sub' field)
    supabase_user_id = payload.get("sub")
    email = payload.get("email")
    
    if not supabase_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user exists in DynamoDB, create if not
    resp = table_users.get_item(Key={"userId": supabase_user_id})
    user_item = resp.get("Item")
    
    if not user_item:
        # Create user in DynamoDB (first time login)
        user_item = {
            "userId": supabase_user_id,
            "email": email or "",
            "tier": "FREE",
            "monthlyUsage": 0,
            "created": int(time.time())
        }
        table_users.put_item(Item=user_item)
        print(f"Created new user in DynamoDB: {supabase_user_id}")
    
    return User(
        userId=user_item["userId"],
        email=user_item.get("email", ""),
        tier=user_item.get("tier", "FREE"),
        monthlyUsage=int(user_item.get("monthlyUsage", 0))
    )

