from typing import Any
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.models.user import User


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db),
) -> User:
    # 1. Require a bearer token.
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = credentials.credentials

    # 2. Ask Supabase Auth to validate the token and identify its user.
    try:
        response = httpx.get(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "apikey": settings.supabase_publishable_key,
            },
            timeout=10.0,
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service timed out",
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is unavailable",
        )

    if response.status_code in (401, 403):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not validate the access token",
        )

    try:
        auth_user: dict[str, Any] = response.json()
        auth_user_id = UUID(auth_user["id"])
    except (ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Invalid identity returned by authentication service",
        )

    email = auth_user.get("email")

    if not isinstance(email, str) or not email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="An email address is required",
        )

    # Optional profile field. Never use client-supplied metadata
    # as proof of identity.
    metadata = auth_user.get("user_metadata") or {}
    name = metadata.get("full_name") or metadata.get("name")

    if not isinstance(name, str):
        name = None

    if name is not None:
        name = name[:100]

    # 3. Create the profile if missing, or synchronize it if present.
    # The UUID comes from Supabase's validated Auth response.
    statement = insert(User).values(
        id=auth_user_id,
        email=email,
        name=name,
    )

    statement = statement.on_conflict_do_update(
        index_elements=[User.id],
        set_={
            "email": statement.excluded.email,
            "name": statement.excluded.name,
        },
    )

    try:
        db.execute(statement)
        db.commit()

        user = db.get(User, auth_user_id)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not load the user profile",
            )

        return user

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        # Do not expose raw SQL errors or database credentials.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not synchronize the user profile",
        )