import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const dbUrl = process.env.DATABASE_URL || "";
const needsSsl =
  (process.env.PGSSLMODE && process.env.PGSSLMODE.toLowerCase() === "require") ||
  dbUrl.includes("sslmode=require");

const allowInsecure =
  (process.env.PGSSL_ALLOW_INSECURE && process.env.PGSSL_ALLOW_INSECURE.toLowerCase() === "true") ||
  dbUrl.includes("supabase.com") ||
  dbUrl.includes("pooler.supabase.com");

export const pool = new Pool({
  connectionString: dbUrl,
  ssl: needsSsl || allowInsecure ? { rejectUnauthorized: false } : undefined
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, "schema.sql");

export async function ensureSchema(){
  const sql = fs.readFileSync(schemaPath, "utf8");
  await pool.query(sql);
}
