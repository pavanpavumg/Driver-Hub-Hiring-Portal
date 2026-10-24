import sqlite3
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from database import connect
from dependencies import AuthenticatedUser, current_user
from schemas import LoginRequest, RegisterRequest
from security import create_token, hash_password, verify_password


router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", status_code=201)
def register(data: RegisterRequest) -> dict[str, Any]:
    email = str(data.email).lower().strip()
    try:
        with connect() as db:
            cursor = db.execute(
                """
                INSERT INTO users(name, email, phone, password_hash, role, company)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    data.name.strip(),
                    email,
                    data.phone.strip(),
                    hash_password(data.password),
                    data.role,
                    data.company.strip(),
                ),
            )
            user_id = cursor.lastrowid
            if data.role == "driver":
                db.execute("INSERT INTO profiles(user_id) VALUES (?)", (user_id,))
            row = db.execute(
                """
                SELECT id, name, email, phone, role, company, created_at
                FROM users WHERE id = ?
                """,
                (user_id,),
            ).fetchone()
    except sqlite3.IntegrityError as exc:
        if "users.email" in str(exc):
            raise HTTPException(status_code=409, detail="Email already registered.") from exc
        raise

    return {"message": "Account created", "user": dict(row)}


@router.post("/login")
def login(data: LoginRequest) -> dict[str, Any]:
    email = str(data.email).lower().strip()
    with connect() as db:
        row = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    if not row or not verify_password(data.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    if not row["is_active"]:
        raise HTTPException(status_code=403, detail="Account blocked.")

    user = dict(row)
    user.pop("password_hash", None)
    return {
        "access_token": create_token(user),
        "token_type": "bearer",
        "user": user,
    }


@router.get("/me")
def me(user: AuthenticatedUser = Depends(current_user)) -> AuthenticatedUser:
    return user
