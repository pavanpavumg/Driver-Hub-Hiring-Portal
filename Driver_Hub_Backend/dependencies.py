from collections.abc import Callable
from typing import Any, Optional

from fastapi import Depends, Header, HTTPException

from database import connect
from security import read_token


AuthenticatedUser = dict[str, Any]


def current_user(
    authorization: Optional[str] = Header(default=None),
) -> AuthenticatedUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Please log in.")

    token = read_token(authorization[7:])
    if not token:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")

    with connect() as db:
        row = db.execute(
            """
            SELECT id, name, email, phone, role, company, is_active, created_at
            FROM users
            WHERE id = ?
            """,
            (token["sub"],),
        ).fetchone()

    if not row or not row["is_active"]:
        raise HTTPException(status_code=401, detail="Account unavailable.")
    return dict(row)


def role_required(*roles: str) -> Callable[..., AuthenticatedUser]:
    def check(user: AuthenticatedUser = Depends(current_user)) -> AuthenticatedUser:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="You do not have permission.")
        return user

    return check
