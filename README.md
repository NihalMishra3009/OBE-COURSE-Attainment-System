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

### Architecture
```
Frontend (Vercel) → Backend API (Railway) → PostgreSQL (Railway)
```

### Backend (Railway)
1. Connect your GitHub repo to Railway
2. In Railway > Backend Service > Variables, set these environment variables:
   - `DATABASE_URL` = PostgreSQL connection string (Railway auto-populates if linked to Postgres plugin)
   - `JWT_SECRET` = Strong random secret (minimum 32 characters, e.g., `openssl rand -base64 32`)
   - `CORS_ORIGIN` = Your Vercel frontend URL (e.g., `https://obe-course-attainment-system.vercel.app`)
3. Railway will automatically detect and run the `Procfile` in the repo root
4. Once deployed, your Railway public URL will be used by the frontend

**Reference:** See [`backend/.env.railway.example`](./backend/.env.railway.example) for template values.

### Database (Railway PostgreSQL Plugin)
1. In Railway project, add a **PostgreSQL** plugin
2. Link it to your Backend service (Railway auto-sets `DATABASE_URL`)
3. Schema is auto-created on first login (embedded in backend code as fallback)

### Frontend (Vercel)
1. Connect your GitHub repo to Vercel
2. Frontend is automatically built and served from the `frontend/` directory
3. Configure [`frontend/config.js`](./frontend/config.js):
   - Set `window.__API_BASE = "https://your-railway-service-url.up.railway.app"`
4. Redeploy after config changes

### Troubleshooting
If login fails after deployment:
1. **Check Railway logs** for actual error (schema file not found, DB connection failed, etc.)
2. **Verify CORS_ORIGIN** in Railway matches your Vercel domain (e.g., `https://obe-course-attainment-system.vercel.app`)
3. **Verify DATABASE_URL** is set and the Postgres plugin is linked to the backend service
4. **Check frontend config** points to correct Railway URL with `https://`
5. **Check JWT_SECRET** is set (if missing, tokens won't sign correctly)
