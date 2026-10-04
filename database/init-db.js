import bcrypt from "bcryptjs";
import { pool, ensureDbInitialized } from "../backend/db.js";

async function main() {
  await ensureDbInitialized();
  console.log("DB initialized");
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

