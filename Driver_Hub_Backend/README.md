# Driver Hub Backend — FastAPI + SQLite

Learning-project backend using FastAPI and Python's built-in `sqlite3`.

## Run on Windows

Open this folder in VS Code and run:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

If PowerShell activation is blocked, use Command Prompt:

```bat
py -m venv .venv
.\.venv\Scripts\activate.bat
pip install -r requirements.txt
uvicorn main:app --reload
```

The API listens at `http://127.0.0.1:8000`; interactive API documentation is at `http://127.0.0.1:8000/docs`. SQLite is initialized automatically with six sample jobs.

## Project structure

- `main.py` creates the FastAPI application, configures middleware, and registers route modules.
- `routers/` contains endpoint handlers grouped by feature: authentication, jobs, profiles, applications, and administration.
- `schemas.py` defines and validates API request models.
- `dependencies.py` contains shared authentication and role-based authorization dependencies.
- `database.py` manages SQLite connections and schema initialization.
- `security.py` contains password hashing and token helpers.

## Run with the frontend

Start the backend, then serve the sibling `Driver_Hub_Frontend` folder using VS Code Live Server or another local static web server. Open its `index.html`; the frontend defaults to this backend URL.

## Endpoints

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /jobs`, `GET /jobs/{job_id}`, `POST /jobs`
- `GET/PUT /profile/me`
- `POST /jobs/{job_id}/apply`, `GET /applications/me`
- `GET /employer/jobs`, `GET /employer/applications`
- `PATCH /applications/{application_id}/status`
- `GET /admin/stats`, `GET /admin/jobs`, `DELETE /admin/jobs/{job_id}`
- `GET /admin/users`, `PATCH /admin/users/{user_id}/block`, `PATCH /admin/users/{user_id}/unblock`

## Admin access

Public registration cannot create admin accounts. Provision an admin account directly in the database before using the admin endpoints; never expose public admin registration.

## Run workflow tests

From the backend folder, run:

```powershell
pip install -r requirements-dev.txt
..\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

The tests use a temporary SQLite database and do not alter `driver_hub.db`.

## Important

- This is an MVP, not production-ready.
- Set a strong `DRIVER_HUB_SECRET` environment variable before deployment.
- Restrict CORS (`allow_origins`) to your actual frontend URL before deployment; the current wildcard is for local development only.
- Resume selection stores only `resume_filename`; file contents and job-opportunity notifications are not implemented.
- The frontend stores the bearer token in this browser's local storage. Application data is stored by this API in SQLite.
