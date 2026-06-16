# OBE-COURSE-Attainment-System

A full-stack web application to create OBE course files and calculate attainment for courses.

## Tech Stack
- Frontend: HTML, CSS, JavaScript (vanilla)
- Backend: Node.js, Express
- Database: PostgreSQL
- Dev tooling: npm, dotenv

## Project Structure
- `backend/` - Express API, database connection, and server startup
- `frontend/` - Static SPA, browser config, styles, and media
- `database/` - Schema and initialization scripts
- `index.html` - Root redirect into the frontend app

### Backend
- `backend/server.js` - HTTP API and app bootstrap
- `backend/db.js` - PostgreSQL pool and schema bootstrap
- `backend/.env.example` - Local environment template

### Frontend
- `frontend/index.html` - Main UI shell
- `frontend/script.js` - Browser logic and app state
- `frontend/styles.css` - Styling
- `frontend/config.js` - API base URL for the browser

## How It Works
1. The frontend calls the backend REST API for CRUD on courses, subjects, and attainment data.
2. The backend validates requests, handles auth with JWT, and persists data to PostgreSQL.
3. The backend exposes endpoints for reports and export features.

## Environment & Config
Create and configure environment files before running:
- `backend/.env` from `backend/.env.example`
  - `DATABASE_URL=postgres://user:pass@host:port/dbname`
  - `JWT_SECRET=your_jwt_secret`
  - `PORT=3000`

## Local Setup
1. Backend:
   ```powershell
   cd backend
   npm install
   npm run init-db
   npm start
   ```
2. Frontend:
   Serve `frontend/` statically, or open `frontend/index.html` in a browser.

## Database
- Use PostgreSQL.
- Create schema with `npm run init-db` from `backend/`.

## Deployment
- Frontend: deploy `frontend/` to Cloudflare Pages.
- Backend: deploy `backend/` to Railway.
- Database: use Railway PostgreSQL.
- Set `DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGIN` in Railway variables.
- Set `window.__API_BASE` in `frontend/config.js` to the Railway backend URL after the backend is live.
- Keep `frontend/_redirects` in place so Cloudflare Pages can serve the SPA routes.

## Troubleshooting
- `500` errors: check backend logs, DB connectivity, and migrations.
- CORS: ensure the frontend origin matches `CORS_ORIGIN`.
