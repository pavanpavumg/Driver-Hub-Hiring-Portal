from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from database import connect
from dependencies import AuthenticatedUser, role_required
from schemas import JobCreate


router = APIRouter(tags=["jobs"])


@router.get("/jobs")
def list_jobs(
    keyword: str = "",
    location: str = "",
    category: str = "",
    min_salary: int = Query(default=0, ge=0),
    sort: str = "recent",
) -> list[dict[str, Any]]:
    sql = "SELECT * FROM jobs WHERE is_active = 1"
    args: list[Any] = []
    if keyword:
        sql += " AND (title LIKE ? OR category LIKE ? OR company LIKE ? OR description LIKE ?)"
        like = f"%{keyword}%"
        args.extend([like] * 4)
    if location:
        sql += " AND location LIKE ?"
        args.append(f"%{location}%")
    if category:
        sql += " AND category = ?"
        args.append(category)
    sql += " AND salary >= ?"
    args.append(min_salary)
    sql += " ORDER BY salary DESC" if sort == "salary" else " ORDER BY created_at DESC, id DESC"

    with connect() as db:
        rows = db.execute(sql, args).fetchall()
    return [dict(row) for row in rows]


@router.get("/jobs/{job_id}")
def job_detail(job_id: int) -> dict[str, Any]:
    with connect() as db:
        row = db.execute(
            "SELECT * FROM jobs WHERE id = ? AND is_active = 1", (job_id,)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found.")
    return dict(row)


@router.post("/jobs", status_code=201)
def create_job(
    data: JobCreate,
    user: AuthenticatedUser = Depends(role_required("employer")),
) -> dict[str, Any]:
    with connect() as db:
        cursor = db.execute(
            """
            INSERT INTO jobs(
                employer_id, title, category, company, location, salary, experience,
                working_hours, required_documents, description
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user["id"],
                data.title,
                data.category,
                data.company,
                data.location,
                data.salary,
                data.experience,
                data.working_hours,
                data.required_documents,
                data.description,
            ),
        )
        row = db.execute("SELECT * FROM jobs WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row)


@router.get("/employer/jobs")
def employer_jobs(
    user: AuthenticatedUser = Depends(role_required("employer")),
) -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute(
            """
            SELECT j.*,
                   (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS application_count
            FROM jobs j
            WHERE j.employer_id = ?
            ORDER BY j.created_at DESC
            """,
            (user["id"],),
        ).fetchall()
    return [dict(row) for row in rows]
