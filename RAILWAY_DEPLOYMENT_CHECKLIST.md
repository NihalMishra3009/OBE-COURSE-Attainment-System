# Railway + Vercel Deployment Checklist

## ✅ What Was Fixed

This document explains all production-safe fixes applied to make your app work on Railway + Vercel.

### 1. **Schema File Resolution (db.js)**
- **Problem:** Railway couldn't find `database/schema.sql` because the path was hardcoded incorrectly
- **Fix:** Updated path resolution to check multiple locations and always fall back to embedded schema
- **Benefit:** App works on Railway, locally, and in any directory structure

### 2. **Better Error Logging (server.js)**
- **Problem:** Login errors were logged as generic "Login failed" — impossible to debug
- **Fix:** Added detailed error logging with error code, message, and stack trace
- **Benefit:** Railway logs now show actual cause (DB connection error, SSL issue, file not found, etc.)

### 3. **CORS Configuration (server.js)**
- **Problem:** Vercel domain wasn't in CORS whitelist (only Netlify and Cloudflare Pages were allowed)
- **Fix:** Added `.vercel.app` domain pattern to CORS allowlist
- **Benefit:** Frontend on Vercel can now call Railway backend without CORS errors

### 4. **Environment Variables (`.env.railway.example`)**
- **Problem:** Old example file still referenced Netlify URL and lacked detailed documentation
- **Fix:** Updated with current architecture, added guidance on where to find each variable
- **Benefit:** Clearer setup process for Railway

### 5. **Procfile (new file)**
- **Problem:** Railway didn't know which command to run or where to find the backend
- **Fix:** Created `Procfile` to explicitly tell Railway how to start the app
- **Benefit:** Consistent startup behavior across deployments

### 6. **README Deployment Section**
- **Problem:** README described old Netlify + Supabase setup, not current Railway + Vercel
- **Fix:** Updated with step-by-step Railway + Vercel deployment instructions
- **Benefit:** Easier onboarding for future deployments or team members

---

## 🚀 How to Deploy

### **Step 1: Set Railway Backend Environment Variables**

In Railway Dashboard → Your Backend Service → Variables, create these:

```
DATABASE_URL=<automatically set if you link the PostgreSQL plugin>
JWT_SECRET=<generate with: openssl rand -base64 32>
CORS_ORIGIN=https://obe-course-attainment-system.vercel.app
PORT=3000
```

**CRITICAL:** 
- `CORS_ORIGIN` must match your Vercel frontend URL exactly
- `JWT_SECRET` must be at least 32 characters and random
- If `DATABASE_URL` is empty, link the PostgreSQL plugin in Railway

### **Step 2: Link Railway PostgreSQL Database**

1. In Railway project, click "Add Service" → Select "PostgreSQL"
2. In your Backend service, click "Add" → Link to the PostgreSQL plugin
3. Railway automatically populates `DATABASE_URL` environment variable
4. Schema is auto-created on first login

### **Step 3: Deploy Frontend on Vercel**

1. Connect your GitHub repo to Vercel (or Vercel CLI)
2. Update `frontend/config.js` with your Railway URL:
   ```javascript
   window.__API_BASE = "https://your-railway-service-url.up.railway.app";
   ```
3. Commit and push — Vercel auto-redeploys
4. Verify `https://obe-course-attainment-system.vercel.app` works

### **Step 4: Test Login**

1. Open your Vercel frontend: `https://obe-course-attainment-system.vercel.app`
2. Login with default credentials:
   - Username: `admin`
   - Password: `admin123`
3. If login fails, check Railway logs (see **Troubleshooting** below)

---

## 🔍 Troubleshooting

### **Symptom: "Login failed" HTTP 500**

**Check Railway Logs:**
1. Go to Railway → Backend Service → Logs
2. Look for error lines after you attempted login
3. Common errors:

| Error | Cause | Fix |
|-------|-------|-----|
| `ENOENT: no such file or directory` | Schema file not found | Update deployed code (this should be fixed now) |
| `Error: connect ECONNREFUSED` | DATABASE_URL is wrong or DB not running | Verify DATABASE_URL and link PostgreSQL plugin |
| `ssl: true, rejectUnauthorized: false` errors | SSL certificate issue | Already handled in db.js, but check Railway logs |
| `relation "users" does not exist` | Schema not created | Schema auto-creates on login, check DB connection first |
| `Not allowed by CORS` | CORS_ORIGIN mismatch | Verify it matches your Vercel URL exactly |

### **Symptom: Frontend makes request but get CORS error**

**Check CORS_ORIGIN:**
```bash
# In Railway Backend variables, verify:
CORS_ORIGIN="https://obe-course-attainment-system.vercel.app"

# NOT:
CORS_ORIGIN="obe-course-attainment-system.vercel.app"  # Missing https://
CORS_ORIGIN="https://nba-obc.netlify.app"  # Old Netlify URL
```

### **Symptom: Schema not creating**

The schema auto-creates from embedded definition in `backend/db.js` on first login. If it fails:
1. Check DATABASE_URL is valid
2. Check PostgreSQL plugin is linked
3. Check Railway logs for the specific SQL error
4. Manually run schema from `database/schema.sql` in a psql client if needed

### **Symptom: Default users not creating (can't login with `admin/admin123`)**

The default users are created on first login attempt. They should exist after first ENOENT error is fixed.
If they don't appear, check Railway logs for errors during `ensureDefaultUsers()` call.

---

## 📝 Files Changed

| File | Changes | Reason |
|------|---------|--------|
| `backend/db.js` | Improved schema path resolution with fallback + logging | Fix Railway file path issue |
| `backend/server.js` | Added Vercel CORS + better error logging | Fix CORS & add debugging |
| `backend/.env.railway.example` | Updated docs & Vercel URL | Clearer setup |
| `Procfile` | **NEW** | Explicit Railway startup command |
| `README.md` | Updated deployment section | Current architecture docs |

---

## 🔒 Security Notes

1. **JWT_SECRET:** Generate a strong random secret:
   ```bash
   openssl rand -base64 32
   ```
   Never use hardcoded or weak secrets.

2. **CORS_ORIGIN:** Only allow your Vercel domain, not `*` in production.

3. **DATABASE_URL:** Never commit this to git. Store only in Railway environment variables.

4. **Error Logging:** Production logs now include error details but never credentials or sensitive user data.

---

## ✨ Next Steps

1. **Commit and push** these changes to GitHub
2. **Configure Railway** with environment variables (see **Step 1** above)
3. **Update Vercel** frontend config with Railway URL
4. **Test login** on your Vercel domain
5. **Monitor Railway logs** if any issues occur

If issues persist, check the "Troubleshooting" section above or open a Railway support ticket with the logs.
