# OBE-COURSE-Attainment-System

A full-stack web app for NBA OBE course file creation and attainment calculation. The UI is a single-page frontend served by a Node/Express backend with PostgreSQL for persistence.

## Tech Stack
- Frontend: HTML, CSS, JavaScript (vanilla)
- Backend: Node.js, Express
- Database: PostgreSQL

## Project Structure
```
backend/    # Express API + DB access
frontend/   # Static UI (HTML/CSS/JS)
```

## Setup
1. Create the database:
   ```sql
   CREATE DATABASE nba_db;
   ```
2. Configure env:
   - Copy `backend/.env.example` to `backend/.env` and update values.

3. Install and init:
   ```bash
   cd backend
   npm install
   npm run init-db
   npm start
   ```

4. Open the app:
   - `http://localhost:3000`

## Default Users
- `admin / admin123`
- `head / head123`
- `faculty1 / pass123`

## Notes
- The frontend auto-saves subject changes to the backend.
- `backend/.env` is ignored by git.
