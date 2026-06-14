# OBE-COURSE-Attainment-System

A full‑stack web application to create OBE course files and calculate attainment for courses. This README consolidates tech stack, project structure, setup, running, and deployment steps.

## Tech Stack
- Frontend: HTML, CSS, JavaScript (vanilla)
- Backend: Node.js, Express
- Database: PostgreSQL
- Hosting / Deployment: Vercel (frontend) / Railway / Heroku (backend & Postgres)
- Dev tooling: npm, dotenv

## Project Structure
- backend/  — Express API, database access, migrations
- frontend/ — Static SPA served from this directory
- database/ — Schema and DB scripts
- scripts/  — helper scripts (init, seed)

## How it works (high level)
1. Frontend (SPA) calls Backend REST API for CRUD on courses, subjects, and attainment data.
2. Backend validates requests, handles auth (JWT), and persists data to PostgreSQL.
3. Backend exposes endpoints for reports and export (CSV/PDF).

## Environment & Config
Create and configure environment files before running:
- backend/.env (example: backend/.env.example)
  - DATABASE_URL=postgres://user:pass@host:port/dbname
  - JWT_SECRET=your_jwt_secret
  - PORT=3000

## Local Setup
1. Backend:
   `powershell
   cd backend
   npm install
   cp .env.example .env   # edit values
   npm run init-db        # creates schema + seeds
   npm start
   `
2. Frontend:
   Serve rontend/ static files (or point Vercel to this folder). If developing locally, open rontend/index.html or run a static dev server.

## Database
- Use PostgreSQL.
- Schema creation: 
pm run init-db (backend) or run SQL in database/.
- Backups: export using pg_dump.

## Deployment
- Recommended: Connect GitHub repo to Railway for backend and Postgres plugin.
  - Set DATABASE_URL, JWT_SECRET, CORS_ORIGIN in Railway env vars.
- Frontend: Deploy to Vercel pointing to rontend/ and set window.__API_BASE to the backend URL.
- CI: Optional GitHub Actions to run tests and build.

## Troubleshooting
- 500 errors: check backend logs, DB connectivity, and migrations.
- CORS: ensure frontend origin matches CORS_ORIGIN.

## Contributing
- Fork, create a branch, run tests, and open a PR describing changes.

## Contact
Project maintainer: see repo owner on GitHub

