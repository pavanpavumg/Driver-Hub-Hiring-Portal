# Driver-Hub-Hiring-Portal

> Dedicated job platform connecting professional drivers with verified fleet owners, logistics hubs, and private employers.

---

## 🚀 Key Features

### 👨🏽‍✈️ For Drivers & Candidates
- **Candidate Registration & Login**: Instant authentication with role-based dashboard access.
- **Profile Management**: Profile details, driving licence category (LMV/HMV), verified experience, and skills.
- **Job Search & Advanced Filtering**: Filter opportunities by category, salary, and location.
- **In-Place 1-Click Applications**: Track active status (`Under review`, `Shortlisted`, `Hired`, `Rejected`).
- **Real-Time Job Alerts & Notifications**: Automatic notifications matching driver category and shortlisted application updates.

### 🏢 For Employers & Fleet Managers
- **Employer Workspace**: Post and manage active driver vacancies.
- **Candidate Talent Pool**: Directly search and browse verified driver candidates with licence information.
- **Applicant Review Pipeline**: Shortlist, hire, or reject applicants with instant status syncing.

### 🛡️ For Administrators
- Platform moderation console for users, candidate profiles, and job listings.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: Vanilla ES6+, CSS3 (Design Tokens, Glassmorphism, Micro-Animations), Semantic HTML5.
- **Backend**: FastAPI (Python 3.12), SQLite (`driver_hub.db`), PBKDF2-SHA256 password hashing, HMAC-SHA256 Bearer Tokens.

---

## ⚡ Quick Start

### 1. Run the Backend API
```bash
cd Driver_Hub_Backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at: `http://127.0.0.1:8000/docs`

### 2. Serve the Frontend
Serve `Driver_Hub_Frontend` with any static server (VS Code Live Server or Python):
```bash
cd Driver_Hub_Frontend
python -m http.server 5500
```
Open `http://127.0.0.1:5500/` in your browser.

---

## 🔑 Pre-Seeded Demo Accounts

| Role | Email | Password |
|---|---|---|
| **Driver** | `driver@driverhub.com` | `Password123!` |
| **Employer** | `employer@driverhub.com` | `Password123!` |
| **Admin** | `admin@driverhub.com` | `Password123!` |

---

## ☁️ Deploy to Render (Free Tier)

This repository includes a `render.yaml` Blueprint for 1-click deployment on [Render](https://render.com/).

### Method 1: Using Render Blueprint (Recommended)
1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **Blueprint**.
3. Connect your GitHub repository: `https://github.com/pavanpavumg/Driver-Hub-Hiring-Portal`.
4. Render will detect `render.yaml` and configure the Web Service automatically.
5. Click **Apply**. Your app will be live with full backend and frontend in ~2 minutes!

### Method 2: Manual Web Service Setup
1. On Render, click **New +** > **Web Service**.
2. Connect `https://github.com/pavanpavumg/Driver-Hub-Hiring-Portal`.
3. Set the following settings:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `cd Driver_Hub_Backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
4. Click **Create Web Service**.
