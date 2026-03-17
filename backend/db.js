import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const rawUrl = process.env.DATABASE_URL || "";
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
const schemaPath = path.resolve(__dirname, "schema.sql");

export async function ensureSchema(){
  const sql = fs.readFileSync(schemaPath, "utf8");
  await pool.query(sql);
}
