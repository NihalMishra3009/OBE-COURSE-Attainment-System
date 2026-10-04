import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
if (fs.existsSync(path.resolve(__dirname, ".env"))) {
  dotenv.config({ path: path.resolve(__dirname, ".env") });
}
if (fs.existsSync(path.resolve(__dirname, "..", ".env"))) {
  dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
}

const rawUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || "";
let dbUrl = rawUrl;
let sslOptions = undefined;

if (rawUrl) {
  try {
    const u = new URL(rawUrl);
    const hasSslMode = u.searchParams.has("sslmode");
    u.searchParams.delete("sslmode");
    u.searchParams.delete("sslrootcert");
    u.searchParams.delete("sslcert");
    u.searchParams.delete("sslkey");
    dbUrl = u.toString();

    const isLocal = (u.hostname === "localhost" || u.hostname === "127.0.0.1") && 
                    !hasSslMode && 
                    !process.env.PGSSLMODE && 
                    process.env.PGSSL_ALLOW_INSECURE !== "true";

    if (!isLocal) {
      sslOptions = { rejectUnauthorized: false };
    }
  } catch (e) {
    dbUrl = rawUrl;
    sslOptions = { rejectUnauthorized: false };
  }
}

export const pool = new Pool({
  connectionString: dbUrl || undefined,
  ssl: sslOptions
});

const embeddedSchema = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  pass_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  dept TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
  name TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export async function ensureSchema() {
  const candidates = [
    path.resolve(__dirname, "..", "database", "schema.sql"),
    path.resolve(__dirname, "database", "schema.sql"),
    path.resolve(process.cwd(), "database", "schema.sql"),
    path.resolve(process.cwd(), "backend", "..", "database", "schema.sql"),
  ];
  
  let sql = embeddedSchema;
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        sql = fs.readFileSync(candidate, "utf8");
        console.log(`[DB] Loaded schema from: ${candidate}`);
        break;
      } catch (err) {
        console.warn(`[DB] Warning: Could not read schema file ${candidate}: ${err.message}`);
      }
    }
  }
  
  if (sql === embeddedSchema) {
    console.log(`[DB] Using embedded schema`);
  }
  
  await pool.query(sql);
}

export async function ensureDefaultDepartments() {
  const DEFAULT_DEPARTMENTS = [
    "Computer Engineering",
    "Electronics & Telecommunication",
    "Mechanical Engineering",
    "Civil Engineering",
    "Information Technology",
    "Electrical Engineering",
    "Chemical Engineering",
    "Instrumentation Engineering"
  ];
  for (const dept of DEFAULT_DEPARTMENTS) {
    await pool.query(
      "INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
      [dept]
    );
  }
}

export async function ensureDefaultUsers() {
  const defaults = [
    { username: "admin", password: "admin123", role: "admin", name: "Admin User", dept: "Computer Engineering" },
    { username: "head", password: "head123", role: "head", name: "Head of Dept", dept: "Computer Engineering" },
    { username: "faculty1", password: "pass123", role: "faculty", name: "Dr. A. Sharma", dept: "Computer Engineering" }
  ];
  for (const u of defaults) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      "INSERT INTO users (username, pass_hash, role, name, dept) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (username) DO NOTHING",
      [u.username, hash, u.role, u.name, u.dept]
    );
  }
}

let dbInitialized = false;
let dbInitPromise = null;

export async function ensureDbInitialized() {
  if (dbInitialized) return true;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      await ensureSchema();
      await ensureDefaultDepartments();
      await ensureDefaultUsers();
      dbInitialized = true;
      console.log("[DB] Database initialized successfully (schema, departments, users)");
      return true;
    } catch (err) {
      dbInitPromise = null;
      console.error("[DB Init Error]:", err.message);
      throw err;
    }
  })();

  return dbInitPromise;
}

