# OBE-COURSE-Attainment-System

A full-stack web app for NBA OBE course file creation and attainment calculation. The UI is a single-page frontend served by a Node/Express backend with PostgreSQL for persistence.

## Tech Stack
- Frontend: HTML, CSS, JavaScript (vanilla)
- Backend: Node.js, Express
- Database: PostgreSQL

## Project Structure
```
database/   # Schema + database bootstrap
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
   - If you are using a separate frontend host, also set `frontend/config.js` to your backend URL.

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
## Deploying
### Backend (Railway)
- Set environment variables:
  - `DATABASE_URL` = your Postgres connection string
  - `JWT_SECRET` = any strong secret
  - `CORS_ORIGIN` = your Cloudflare Pages URL
- You can start from [`backend/.env.railway.example`](./backend/.env.railway.example).

### Database (Supabase)
- Use the Supabase **Postgres** connection string.
- Ensure it includes `sslmode=require` (Supabase provides this by default).

### Frontend
- If the frontend is served by the backend, leave `frontend/config.js` empty.
- If the frontend is hosted separately, point `frontend/config.js` at the deployed backend URL.
