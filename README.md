# OBE Course Attainment System

A modern full-stack web application designed for engineering institutions to create Outcome-Based Education (OBE) course files, compute Course Outcome (CO) and Program Outcome (PO) attainments, and generate NBA accreditation audit documentation.

---

## 🚀 Live Links & Monitoring

| Component | Platform | URL |
| :--- | :--- | :--- |
| **Frontend** | **Cloudflare Pages** | [https://obe-course-attainment-system.pages.dev](https://obe-course-attainment-system.pages.dev) |
| **Backend API** | **Render Web Service** | [https://obe-course-attainment-system.onrender.com](https://obe-course-attainment-system.onrender.com) |
| **Database** | **PostgreSQL (Render / Supabase)** | Managed Cloud PostgreSQL |
| **Monitoring / Keep-Alive** | **Better Stack** | Active 3-min ping (Zero Cold Starts) |
| **Repository** | **GitHub** | [NihalMishra3009/OBE-COURSE-Attainment-System](https://github.com/NihalMishra3009/OBE-COURSE-Attainment-System) |

---

## 🛠 Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3, SheetJS (`xlsx.full.min.js`) for Excel parsing & report exports
- **Backend**: Node.js (ES Modules), Express.js
- **Database**: PostgreSQL with `pg` connection pooling and SSL auto-negotiation
- **Authentication**: JWT (`jsonwebtoken`) with `bcryptjs` password hashing
- **Uptime Monitoring**: Better Stack Uptime Monitor

---

## 🔑 Default Credentials

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | User & Department Management, Global Settings |
| **Head of Dept** | `head` | `head123` | Department Overview, Curriculum & Attainment Review |
| **Faculty** | `faculty1` | `pass123` | Course File Generation, Marks Entry, CO-PO Calculation |

---

## 📁 Project Structure

```text
├── backend/
│   ├── server.js          # Express REST API, CORS & authentication routes
│   ├── db.js              # PostgreSQL pool & automated schema bootstrap
│   ├── .env.example       # Environment template
│   └── package.json       # Backend dependencies
├── database/
│   ├── schema.sql         # SQL schema definitions (users, departments, subjects)
│   └── init-db.js         # Database initialization & seed script
├── frontend/
│   ├── index.html         # Main SPA interface shell
│   ├── script.js          # Attainment engine, state management & UI controller
│   ├── styles.css         # Modern responsive styles & print templates
│   ├── config.js          # API base endpoint configuration
│   ├── _redirects         # Cloudflare Pages SPA routing
│   └── lesson-plan-nba.html # Standalone NBA lesson plan module
└── package.json           # Root package scripts
```

---

## ⚙️ Environment Variables

Create `backend/.env` based on `backend/.env.example`:

```ini
# PostgreSQL Connection URL (Render / Supabase / Local)
DATABASE_URL=postgresql://user:password@hostname:5432/dbname?sslmode=require
PGSSLMODE=require
PGSSL_ALLOW_INSECURE=true

# Authentication
JWT_SECRET=8f4d2a7c1b9e4f6d8a3c5e7f9b1d4a6c8e2f7a9c1d3e5f7b9a2c4d6e8f1a3b5

# Allowed CORS Origins
CORS_ORIGIN=https://obe-course-attainment-system.pages.dev,http://localhost:3000,http://127.0.0.1:3000

# Server Port
PORT=3000
```

---

## 💻 Local Setup & Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/NihalMishra3009/OBE-COURSE-Attainment-System.git
   cd OBE-COURSE-Attainment-System
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Initialize Database & Seed Data**:
   ```bash
   npm run init-db
   ```

4. **Start the application**:
   ```bash
   npm start
   ```
   Open `http://localhost:3000` in your browser.

---

## ☁️ Deployment Architecture

### 1. Database (Render / Supabase)
- Create a PostgreSQL database instance.
- Obtain the database connection URI (append `?sslmode=require`).

### 2. Backend (Render Web Service)
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**: Add `DATABASE_URL`, `PGSSLMODE`, `PGSSL_ALLOW_INSECURE`, `JWT_SECRET`, and `CORS_ORIGIN`.

### 3. Frontend (Cloudflare Pages)
- **Framework Preset**: `None`
- **Build Output Directory**: `frontend`
- Set `window.__API_BASE` in `frontend/config.js` to your backend URL.

### 4. 24/7 Keep-Alive (Better Stack)
- Create an HTTP monitor pointing to `https://obe-course-attainment-system.onrender.com/health` with a 3-minute interval to prevent free-tier instances from idling.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
