import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import database
from main import app
from security import hash_password


class DriverHubWorkflowTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "driver_hub_test.db"
        self.database_patch = patch.object(database, "DB_PATH", self.db_path)
        self.database_patch.start()
        self.client = TestClient(app)
        self.client.__enter__()

    def tearDown(self) -> None:
        self.client.__exit__(None, None, None)
        self.database_patch.stop()
        self.temp_dir.cleanup()

    def register(self, email: str, role: str) -> dict:
        return {
            "name": f"Test {role.title()}",
            "email": email,
            "phone": "9876543210",
            "password": "TestPassword123!",
            "role": role,
            "company": "Test Transport" if role == "employer" else "",
        }

    def login(self, email: str) -> dict:
        response = self.client.post(
            "/auth/login",
            json={"email": email, "password": "TestPassword123!"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_driver_employer_and_admin_workflows(self) -> None:
        self.assertEqual(self.client.get("/health").json(), {"status": "ok"})

        driver_email = "workflow-driver@example.com"
        employer_email = "workflow-employer@example.com"
        self.assertEqual(
            self.client.post(
                "/auth/register", json=self.register(driver_email, "driver")
            ).status_code,
            201,
        )
        self.assertEqual(
            self.client.post(
                "/auth/register", json=self.register(employer_email, "employer")
            ).status_code,
            201,
        )
        self.assertEqual(
            self.client.post(
                "/auth/register", json=self.register("workflow-admin@example.com", "admin")
            ).status_code,
            422,
        )

        driver_token = self.login(driver_email)["access_token"]
        employer_token = self.login(employer_email)["access_token"]
        driver_headers = {"Authorization": f"Bearer {driver_token}"}
        employer_headers = {"Authorization": f"Bearer {employer_token}"}
        self.assertEqual(
            self.client.get("/auth/me", headers=driver_headers).json()["role"],
            "driver",
        )

        profile = {
            "name": "Updated Test Driver",
            "phone": "9876543211",
            "location": "Bengaluru",
            "category": "Car Driver",
            "experience": 4,
            "licence_category": "LMV",
            "skills": "Safe driving, route planning",
            "resume_filename": "resume.pdf",
        }
        saved_profile = self.client.put(
            "/profile/me", json=profile, headers=driver_headers
        )
        self.assertEqual(saved_profile.status_code, 200, saved_profile.text)
        self.assertEqual(saved_profile.json()["experience"], 4)
        self.assertEqual(
            self.client.get("/auth/me", headers=driver_headers).json()["name"],
            "Updated Test Driver",
        )

        job_data = {
            "title": "Workflow Test Driver",
            "category": "Car Driver",
            "company": "Test Transport",
            "location": "Bengaluru",
            "salary": 25000,
            "experience": 2,
            "working_hours": "8 hours per day",
            "required_documents": "LMV licence, identity proof",
            "description": "Drive company vehicles on scheduled routes safely.",
        }
        created_job = self.client.post(
            "/jobs", json=job_data, headers=employer_headers
        )
        self.assertEqual(created_job.status_code, 201, created_job.text)
        job_id = created_job.json()["id"]
        listed_jobs = self.client.get(
            "/jobs", params={"category": "Car Driver", "min_salary": 20000}
        ).json()
        self.assertTrue(any(job["id"] == job_id for job in listed_jobs))
        self.assertEqual(self.client.get(f"/jobs/{job_id}").status_code, 200)
        self.assertEqual(
            self.client.get("/employer/jobs", headers=employer_headers).json()[0][
                "application_count"
            ],
            0,
        )
        self.assertEqual(
            self.client.post(f"/jobs/{job_id}/apply", headers=driver_headers).status_code,
            201,
        )
        self.assertEqual(
            self.client.post(f"/jobs/{job_id}/apply", headers=driver_headers).status_code,
            409,
        )
        employer_apps = self.client.get(
            "/employer/applications", headers=employer_headers
        ).json()
        self.assertEqual(len(employer_apps), 1)
        application_id = employer_apps[0]["id"]
        self.assertEqual(
            self.client.patch(
                f"/applications/{application_id}/status",
                json={"status": "Shortlisted"},
                headers=employer_headers,
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.get("/applications/me", headers=driver_headers).json()[0][
                "status"
            ],
            "Shortlisted",
        )

        admin_email = "workflow-admin@example.com"
        with database.connect() as db:
            cursor = db.execute(
                """
                INSERT INTO users(name, email, phone, password_hash, role)
                VALUES (?, ?, ?, ?, 'admin')
                """,
                ("Test Admin", admin_email, "9876543212", hash_password("TestPassword123!")),
            )
            self.assertIsNotNone(cursor.lastrowid)
        admin_token = self.login(admin_email)["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        self.assertEqual(self.client.get("/admin/stats", headers=admin_headers).status_code, 200)
        users = self.client.get("/admin/users", headers=admin_headers).json()
        test_driver_id = next(user["id"] for user in users if user["email"] == driver_email)
        self.assertEqual(
            self.client.patch(
                f"/admin/users/{test_driver_id}/block", headers=admin_headers
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.post(
                "/auth/login",
                json={"email": driver_email, "password": "TestPassword123!"},
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.patch(
                f"/admin/users/{test_driver_id}/unblock", headers=admin_headers
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.delete(f"/admin/jobs/{job_id}", headers=admin_headers).status_code,
            200,
        )
        self.assertEqual(self.client.get(f"/jobs/{job_id}").status_code, 404)


if __name__ == "__main__":
    unittest.main()
