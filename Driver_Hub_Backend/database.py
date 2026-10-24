import sqlite3
import sqlite3
from contextlib import contextmanager
from collections.abc import Generator
from pathlib import Path

DB_PATH = Path(__file__).parent / "driver_hub.db"


@contextmanager
def connect() -> Generator[sqlite3.Connection, None, None]:
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    try:
        with db:
            yield db
    finally:
        db.close()


def init_db() -> None:
    with connect() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS users(
          id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
          phone TEXT NOT NULL, password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('driver','employer','admin')),
          company TEXT DEFAULT '', is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS profiles(
          id INTEGER PRIMARY KEY, user_id INTEGER UNIQUE NOT NULL,
          location TEXT DEFAULT '', category TEXT DEFAULT 'Car Driver',
          experience INTEGER DEFAULT 0, licence_category TEXT DEFAULT '',
          skills TEXT DEFAULT '', resume_filename TEXT DEFAULT '',
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS jobs(
          id INTEGER PRIMARY KEY, employer_id INTEGER, title TEXT NOT NULL,
          category TEXT NOT NULL, company TEXT NOT NULL, location TEXT NOT NULL,
          salary INTEGER NOT NULL DEFAULT 0, experience INTEGER NOT NULL DEFAULT 0,
          working_hours TEXT DEFAULT '', required_documents TEXT DEFAULT '',
          description TEXT NOT NULL, is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(employer_id) REFERENCES users(id) ON DELETE SET NULL
        );
        CREATE TABLE IF NOT EXISTS applications(
          id INTEGER PRIMARY KEY, job_id INTEGER NOT NULL, candidate_id INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'Under review'
            CHECK(status IN ('Under review','Shortlisted','Rejected','Hired')),
          applied_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(job_id,candidate_id),
          FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE,
          FOREIGN KEY(candidate_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """)
        if db.execute("SELECT COUNT(*) FROM jobs").fetchone()[0] == 0:
            samples = [
              ("Company Car Driver","Car Driver","GreenLine Services","Bengaluru, Karnataka",24000,2,"9 hours/day","LMV licence, ID proof","Drive company staff safely and maintain the vehicle."),
              ("Delivery Driver","Delivery Driver","SwiftKart Logistics","Bengaluru, Karnataka",22000,0,"Shift-based","Driving licence, Aadhaar","Deliver packages on time and provide good customer service."),
              ("Heavy Vehicle Driver","Heavy Vehicle","MetroBuild Transport","Peenya, Bengaluru",32000,3,"10 hours/day","HMV licence","Operate heavy vehicles and follow safety procedures."),
              ("Cab Driver","Cab Driver","CityRide Mobility","Whitefield, Bengaluru",28000,1,"Flexible shifts","LMV licence, address proof","Provide safe rides and keep the vehicle in good condition."),
              ("School Bus Driver","School Bus Driver","Bright Future School","Yelahanka, Bengaluru",26000,3,"Morning and afternoon","Licence, police verification","Transport students safely on assigned routes."),
              ("Last-Mile Delivery Driver","Delivery Driver","QuickDrop","Jayanagar, Bengaluru",19000,0,"8-9 hours/day","Driving licence, ID proof","Complete local deliveries. Freshers with a valid licence can apply.")
            ]
            db.executemany("""INSERT INTO jobs(title,category,company,location,salary,experience,working_hours,required_documents,description)
              VALUES(?,?,?,?,?,?,?,?,?)""", samples)
