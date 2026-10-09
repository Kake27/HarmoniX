from typing import Any
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.models.user import User

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    access_token = credentials.credentials

    # Ask Supabase Auth to validate this access token.
    try:
        response = httpx.get(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "apikey": settings.supabase_anon_key,
            },
            timeout=10.0,
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Authentication service is temporarily unavailable",
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    auth_user: dict[str, Any] = response.json()

    try:
        auth_user_id = UUID(auth_user["id"])
    except (KeyError, ValueError, TypeError):
        raise HTTPException(
            status_code=401,
            detail="Invalid user identity returned by authentication service",
        )

    email = auth_user.get("email")
    if not email:
        raise HTTPException(
            status_code=403,
            detail="A verified email address is required",
        )

    # Find the application's profile using the verified Auth UUID.
    user = db.get(User, auth_user_id)

    if user is None:
        user = User(
            id=auth_user_id,
            email=email,
        )
        db.add(user)
    else:
        # Keep the profile email synchronized with Auth.
        user.email = email

    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise

    return user