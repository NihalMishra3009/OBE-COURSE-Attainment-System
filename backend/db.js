import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, "schema.sql");

export async function ensureSchema(){
  const sql = fs.readFileSync(schemaPath, "utf8");
  await pool.query(sql);
}
