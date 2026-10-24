from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from database import connect
from dependencies import AuthenticatedUser, role_required


router = APIRouter(prefix="/admin", tags=["administration"])


@router.get("/stats")
def admin_stats(
    _: AuthenticatedUser = Depends(role_required("admin")),
) -> dict[str, int]:
    with connect() as db:
        return {
            "users": db.execute("SELECT COUNT(*) FROM users").fetchone()[0],
            "drivers": db.execute(
                "SELECT COUNT(*) FROM users WHERE role = 'driver'"
            ).fetchone()[0],
            "employers": db.execute(
                "SELECT COUNT(*) FROM users WHERE role = 'employer'"
            ).fetchone()[0],
            "active_jobs": db.execute(
                "SELECT COUNT(*) FROM jobs WHERE is_active = 1"
            ).fetchone()[0],
            "applications": db.execute(
                "SELECT COUNT(*) FROM applications"
            ).fetchone()[0],
        }


@router.get("/jobs")
def admin_jobs(
    _: AuthenticatedUser = Depends(role_required("admin")),
) -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute(
            "SELECT * FROM jobs ORDER BY created_at DESC"
        ).fetchall()
    return [dict(row) for row in rows]


@router.delete("/jobs/{job_id}")
def delete_job(
    job_id: int,
    _: AuthenticatedUser = Depends(role_required("admin")),
) -> dict[str, str]:
    with connect() as db:
        cursor = db.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Job not found.")
    return {"message": "Job removed"}


@router.get("/users")
def admin_users(
    _: AuthenticatedUser = Depends(role_required("admin")),
) -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute(
            """
            SELECT id, name, email, phone, role, company, is_active, created_at
            FROM users ORDER BY created_at DESC
            """
        ).fetchall()
    return [dict(row) for row in rows]


@router.patch("/users/{user_id}/block")
def block_user(
    user_id: int,
    _: AuthenticatedUser = Depends(role_required("admin")),
) -> dict[str, str]:
    with connect() as db:
        cursor = db.execute(
            "UPDATE users SET is_active = 0 WHERE id = ? AND role != 'admin'",
            (user_id,),
        )
        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404, detail="User not found or cannot block admin."
            )
    return {"message": "User blocked"}


@router.patch("/users/{user_id}/unblock")
def unblock_user(
    user_id: int,
    _: AuthenticatedUser = Depends(role_required("admin")),
) -> dict[str, str]:
    with connect() as db:
        cursor = db.execute(
            "UPDATE users SET is_active = 1 WHERE id = ?", (user_id,)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="User not found.")
    return {"message": "User unblocked"}


@router.get("/applications")
def admin_applications(
    _: AuthenticatedUser = Depends(role_required("admin")),
) -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute(
            """
            SELECT a.id, a.job_id, a.candidate_id, a.status, a.applied_at,
                   j.title AS job_title, j.company,
                   u.name AS candidate_name, u.email AS candidate_email, u.phone AS candidate_phone
            FROM applications a
            JOIN jobs j ON j.id = a.job_id
            JOIN users u ON u.id = a.candidate_id
            ORDER BY a.applied_at DESC
            """
        ).fetchall()
    return [dict(row) for row in rows]

