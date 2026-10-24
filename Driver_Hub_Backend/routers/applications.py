import sqlite3
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from database import connect
from dependencies import AuthenticatedUser, role_required
from schemas import ApplicationStatusUpdate


router = APIRouter(tags=["applications"])


@router.post("/jobs/{job_id}/apply", status_code=201)
def apply(
    job_id: int,
    user: AuthenticatedUser = Depends(role_required("driver")),
) -> dict[str, Any]:
    with connect() as db:
        if not db.execute(
            "SELECT id FROM jobs WHERE id = ? AND is_active = 1", (job_id,)
        ).fetchone():
            raise HTTPException(status_code=404, detail="Job not found.")
        try:
            cursor = db.execute(
                "INSERT INTO applications(job_id, candidate_id) VALUES (?, ?)",
                (job_id, user["id"]),
            )
        except sqlite3.IntegrityError as exc:
            if "applications.job_id, applications.candidate_id" in str(exc):
                raise HTTPException(
                    status_code=409, detail="Already applied for this job."
                ) from exc
            raise
        row = db.execute(
            """
            SELECT a.*, j.title AS job_title, j.company
            FROM applications a
            JOIN jobs j ON j.id = a.job_id
            WHERE a.id = ?
            """,
            (cursor.lastrowid,),
        ).fetchone()
    return dict(row)


@router.get("/applications/me")
def my_applications(
    user: AuthenticatedUser = Depends(role_required("driver")),
) -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute(
            """
            SELECT a.*, j.title AS job_title, j.company, j.location, j.salary
            FROM applications a
            JOIN jobs j ON j.id = a.job_id
            WHERE a.candidate_id = ?
            ORDER BY a.applied_at DESC
            """,
            (user["id"],),
        ).fetchall()
    return [dict(row) for row in rows]


@router.get("/employer/applications")
def employer_applications(
    user: AuthenticatedUser = Depends(role_required("employer")),
) -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute(
            """
            SELECT a.id, a.job_id, a.candidate_id, a.status, a.applied_at,
                   j.title AS job_title, j.company,
                   u.name AS candidate_name, u.email AS candidate_email,
                   u.phone AS candidate_phone, p.category AS driver_category,
                   p.experience, p.location AS candidate_location,
                   p.licence_category, p.skills
            FROM applications a
            JOIN jobs j ON j.id = a.job_id
            JOIN users u ON u.id = a.candidate_id
            LEFT JOIN profiles p ON p.user_id = u.id
            WHERE j.employer_id = ?
            ORDER BY a.applied_at DESC
            """,
            (user["id"],),
        ).fetchall()
    return [dict(row) for row in rows]


@router.patch("/applications/{application_id}/status")
def update_status(
    application_id: int,
    data: ApplicationStatusUpdate,
    user: AuthenticatedUser = Depends(role_required("employer", "admin")),
) -> dict[str, Any]:
    with connect() as db:
        row = db.execute(
            """
            SELECT a.id, j.employer_id
            FROM applications a
            JOIN jobs j ON j.id = a.job_id
            WHERE a.id = ?
            """,
            (application_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Application not found.")
        if user["role"] != "admin" and row["employer_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Not your job application.")

        db.execute(
            "UPDATE applications SET status = ? WHERE id = ?",
            (data.status, application_id),
        )
        updated = db.execute(
            "SELECT * FROM applications WHERE id = ?", (application_id,)
        ).fetchone()
    return dict(updated)
