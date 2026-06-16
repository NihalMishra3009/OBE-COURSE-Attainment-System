import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const rawUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || "";
let dbUrl = rawUrl;
const lower = rawUrl.toLowerCase();

const needsSsl =
  (process.env.PGSSLMODE && process.env.PGSSLMODE.toLowerCase() === "require") ||
  lower.includes("sslmode=require");

const allowInsecure =
  (process.env.PGSSL_ALLOW_INSECURE && process.env.PGSSL_ALLOW_INSECURE.toLowerCase() === "true") ||
  lower.includes("supabase.com") ||
  lower.includes("pooler.supabase.com");

// If we need to allow insecure SSL, strip sslmode from URL to prevent override
if (allowInsecure && rawUrl) {
  try {
    const u = new URL(rawUrl);
    u.searchParams.delete("sslmode");
    u.searchParams.delete("sslrootcert");
    dbUrl = u.toString();
  } catch {
    dbUrl = rawUrl;
  }
}

export const pool = new Pool({
  connectionString: dbUrl,
  ssl: (needsSsl || allowInsecure) ? { rejectUnauthorized: false } : undefined
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export async function ensureSchema(){
  // Railway deployment: files are in /app, so check multiple paths
  // Production-safe: Always use embedded schema as fallback
  const candidates = [
    // Current directory relative paths (for standard dev/prod)
    path.resolve(__dirname, "..", "database", "schema.sql"),
    path.resolve(__dirname, "database", "schema.sql"),
    // Project root relative (for Railway /app layout)
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
    console.log(`[DB] Using embedded schema (no external schema.sql found)`);
  }
  
  await pool.query(sql);
}
