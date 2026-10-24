from typing import Any

from fastapi import APIRouter, Depends

from database import connect
from dependencies import AuthenticatedUser, role_required
from schemas import ProfileUpdate


router = APIRouter(prefix="/profile", tags=["profiles"])


@router.get("/me")
def get_profile(
    user: AuthenticatedUser = Depends(role_required("driver")),
) -> dict[str, Any]:
    with connect() as db:
        row = db.execute(
            "SELECT * FROM profiles WHERE user_id = ?", (user["id"],)
        ).fetchone()
    return dict(row) if row else {}


@router.put("/me")
def save_profile(
    data: ProfileUpdate,
    user: AuthenticatedUser = Depends(role_required("driver")),
) -> dict[str, Any]:
    with connect() as db:
        if data.name is not None or data.phone is not None:
            db.execute(
                "UPDATE users SET name = ?, phone = ? WHERE id = ?",
                (
                    data.name.strip() if data.name is not None else user["name"],
                    data.phone.strip() if data.phone is not None else user["phone"],
                    user["id"],
                ),
            )
        db.execute(
            """
            INSERT INTO profiles(
                user_id, location, category, experience, licence_category, skills, resume_filename
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                location = excluded.location,
                category = excluded.category,
                experience = excluded.experience,
                licence_category = excluded.licence_category,
                skills = excluded.skills,
                resume_filename = excluded.resume_filename
            """,
            (
                user["id"],
                data.location,
                data.category,
                data.experience,
                data.licence_category,
                data.skills,
                data.resume_filename,
            ),
        )
        row = db.execute(
            "SELECT * FROM profiles WHERE user_id = ?", (user["id"],)
        ).fetchone()
    return dict(row)


@router.get("/candidates")
def list_candidates(
    category: str = "",
    location: str = "",
    user: AuthenticatedUser = Depends(role_required("employer", "admin")),
) -> list[dict[str, Any]]:
    sql = """
    SELECT u.id, u.name, u.email, u.phone, p.location, p.category, p.experience,
           p.licence_category, p.skills, p.resume_filename
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.role = 'driver' AND u.is_active = 1
    """
    args = []
    if category:
        sql += " AND p.category = ?"
        args.append(category)
    if location:
        sql += " AND p.location LIKE ?"
        args.append(f"%{location}%")
    sql += " ORDER BY p.experience DESC, u.id DESC"
    with connect() as db:
        rows = db.execute(sql, args).fetchall()
    return [dict(row) for row in rows]

