# Driver Hub — Frontend

Responsive HTML/CSS/JavaScript frontend for the Driver Hub FastAPI backend.

## Frontend structure

- `index.html` is the application shell; the shared header/footer and each screen are loaded from their own HTML template.
- `partials/` contains shared page chrome.
- `views/` contains separate home, job search, authentication, driver, employer, and admin screens.
- `js/core.js` provides shared API, session, formatting, and feedback helpers.
- `js/navigation.js` owns view switching and role-based workspace access.
- `js/auth.js` handles registration and login.
- `js/jobs.js` handles job search, filtering, and applications.
- `js/driver.js` handles driver profile and application tracking.
- `js/employer.js` handles job posting and candidate decisions.
- `js/admin.js` handles dashboard statistics, job removal, and account controls.
- `js/main.js` loads the templates, initializes the frontend modules, and restores the session.
- `styles.css` and `frontend-polish.css` hold the base and responsive/accessibility styles.

## Run locally

1. Start the backend from `Driver_Hub_Backend` using its README instructions. By default it listens at `http://127.0.0.1:8000`.
2. Serve `Driver_Hub_Frontend` with VS Code Live Server or another local static web server, then open its `index.html`. Do not open the HTML directly with `file://`; JavaScript modules require an HTTP server.
3. Register a driver or employer account and log in. The frontend uses the backend API for authentication and application data.
4. API documentation is available at `http://127.0.0.1:8000/docs`.

The frontend defaults to `http://127.0.0.1:8000`. To use another API address, define `window.DRIVER_HUB_API_URL` before `js/main.js` loads.

## Demo Accounts (1-Click Login Enabled)

Password for all pre-configured demo personas is: `Password123!`

| Role | Email | Name / Entity | Purpose |
| :--- | :--- | :--- | :--- |
| **Driver / Candidate** | `driver@driverhub.com` | Ravi Kumar | Driver profile, job applications, matched alerts |
| **Employer** | `employer@driverhub.com` | SwiftKart Logistics | Job vacancies, candidate applications & talent search |
| **Admin** | `admin@driverhub.com` | System Administrator | Platform stats, candidate/employer/job moderation |

*You can switch roles instantly anytime during a live demo using the persistent top switcher ribbon.*

## Connected Features

- **1-Click Demo Persona Switcher**: Seamlessly toggle between Driver, Employer, and Admin from any screen.
- **Driver Workspace**: Profile management (experience, licence, skills, documents), applied job tracking with status badges (Under review, Shortlisted, Hired, Rejected), and real-time opportunity notifications.
- **Job Discovery & Search**: Keyword and city filters, driver category filter, salary threshold, sorting, and rich **Job Details Modal** with full requirements.
- **Employer Workspace**: Publish driver vacancies, manage applications with direct phone/email contact links, update candidate hiring stage, and search the **Driver Talent Pool** directory.
- **Admin Console**: Real-time platform statistics (Total Accounts, Drivers, Employers, Active Jobs, Total Applications), candidate moderation, employer moderation, job vacancy removal, and application oversight.
- **Responsive & Accessible UI**: Clean mobile-first design, high contrast, keyboard navigation, animated micro-interactions, and live API connection indicator.