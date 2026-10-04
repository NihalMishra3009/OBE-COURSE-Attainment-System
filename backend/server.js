import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import { pool, ensureDbInitialized } from "./db.js";

dotenv.config();

const app = express();
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map(s => s.trim()).filter(Boolean)
  : [];
const allowAll = corsOrigins.includes("*");

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowAll || corsOrigins.length === 0) return cb(null, true);
    if (corsOrigins.includes(origin)) return cb(null, true);
    if (origin.endsWith(".pages.dev") || origin.endsWith(".onrender.com")) return cb(null, true);
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) return cb(null, true);
    return cb(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: "5mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, "..", "frontend");

app.use(express.static(FRONTEND_DIR));

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

function signToken(user) {
  return jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") return next();
  return res.status(403).json({ error: "Admin only" });
}

// Auto-initialize DB on API requests if not initialized yet
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api") || req.path === "/health/db") {
    try {
      await ensureDbInitialized();
    } catch (e) {
      console.warn(`[DB Init Warning on ${req.path}]:`, e.message);
    }
  }
  next();
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Missing credentials" });
  try {
    await ensureDbInitialized();
    const { rows } = await pool.query(
      "SELECT username, pass_hash, role, name, dept FROM users WHERE username=$1",
      [username]
    );
    if (rows.length === 0) return res.status(401).json({ error: "Invalid username or password" });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.pass_hash);
    if (!ok) return res.status(401).json({ error: "Invalid username or password" });
    const token = signToken(user);
    res.json({ token, user: { username: user.username, role: user.role, name: user.name, dept: user.dept } });
  } catch (e) {
    console.error("[ERROR] Login failed:", {
      message: e.message,
      code: e.code,
      stack: e.stack
    });
    res.status(500).json({ error: "Login failed: " + (e.message || "Database connection error") });
  }
});

app.get("/api/bootstrap", auth, async (req, res) => {
  try {
    await ensureDbInitialized();
    const deps = await pool.query("SELECT name FROM departments ORDER BY name ASC");
    const subs = await pool.query("SELECT id, data FROM subjects");
    const subjects = {};
    subs.rows.forEach(r => { subjects[r.id] = r.data; });
    res.json({ departments: deps.rows.map(r => r.name), subjects });
  } catch (e) {
    res.status(500).json({ error: "Failed to load data: " + e.message });
  }
});

app.get("/api/users", auth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT username, role, name, dept FROM users ORDER BY username ASC");
    res.json({ users: rows });
  } catch (e) {
    res.status(500).json({ error: "Failed to load users: " + e.message });
  }
});

app.post("/api/users", auth, requireAdmin, async (req, res) => {
  const { username, password, role, name, dept } = req.body || {};
  if (!username || !password || !role || !name || !dept) return res.status(400).json({ error: "Missing fields" });
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (username, pass_hash, role, name, dept) VALUES ($1,$2,$3,$4,$5)",
      [username, hash, role, name, dept]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to add user: " + e.message });
  }
});

app.delete("/api/users/:username", auth, requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE username=$1", [req.params.username]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete user: " + e.message });
  }
});

app.post("/api/departments", auth, requireAdmin, async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "Missing name" });
  try {
    await pool.query("INSERT INTO departments (name) VALUES ($1)", [name]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to add department: " + e.message });
  }
});

app.delete("/api/departments/:name", auth, requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM departments WHERE name=$1", [req.params.name]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete department: " + e.message });
  }
});

app.get("/api/subjects", auth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, data FROM subjects");
    res.json({ subjects: rows });
  } catch (e) {
    res.status(500).json({ error: "Failed to load subjects: " + e.message });
  }
});

app.post("/api/subjects", auth, async (req, res) => {
  const s = req.body;
  if (!s || !s.id) return res.status(400).json({ error: "Missing subject" });
  try {
    await pool.query("INSERT INTO subjects (id, data) VALUES ($1,$2)", [s.id, s]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to create subject: " + e.message });
  }
});

app.put("/api/subjects/:id", auth, async (req, res) => {
  const s = req.body;
  const id = req.params.id;
  if (!s || !id) return res.status(400).json({ error: "Missing subject" });
  try {
    await pool.query("INSERT INTO subjects (id, data) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET data=$2, updated_at=NOW()", [id, s]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to save subject: " + e.message });
  }
});

app.delete("/api/subjects/:id", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM subjects WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete subject: " + e.message });
  }
});

app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/", (req, res) => res.json({ ok: true, service: "obe-course-attainment-system-backend" }));
app.get("/health/db", async (req, res) => {
  try {
    await ensureDbInitialized();
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "connected" });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const port = process.env.PORT || 3000;
ensureDbInitialized()
  .then(() => {
    console.log("[DB] Ready on startup.");
  })
  .catch((e) => {
    console.warn("[DB] Startup initialization postponed (will retry on incoming request):", e.message);
  })
  .finally(() => {
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  });


