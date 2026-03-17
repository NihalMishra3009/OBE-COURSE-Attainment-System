import bcrypt from "bcryptjs";
import { pool, ensureSchema } from "../db.js";

const DEFAULT_DEPARTMENTS = [
  "Computer Engineering","Electronics & Telecommunication",
  "Mechanical Engineering","Civil Engineering",
  "Information Technology","Electrical Engineering",
  "Chemical Engineering","Instrumentation Engineering"
];

async function upsertDepartments(){
  for(const d of DEFAULT_DEPARTMENTS){
    await pool.query("INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [d]);
  }
}

async function ensureUsers(){
  const users = [
    {username:"admin", password:"admin123", role:"admin", name:"Admin User", dept:"Computer Engineering"},
    {username:"head", password:"head123", role:"head", name:"Head of Dept", dept:"Computer Engineering"},
    {username:"faculty1", password:"pass123", role:"faculty", name:"Dr. A. Sharma", dept:"Computer Engineering"}
  ];
  for(const u of users){
    const {rows} = await pool.query("SELECT username FROM users WHERE username=$1", [u.username]);
    if(rows.length===0){
      const hash = await bcrypt.hash(u.password, 10);
      await pool.query("INSERT INTO users (username, pass_hash, role, name, dept) VALUES ($1,$2,$3,$4,$5)", [u.username, hash, u.role, u.name, u.dept]);
    }
  }
}

async function main(){
  await ensureSchema();
  await upsertDepartments();
  await ensureUsers();
  console.log("DB initialized");
  await pool.end();
}

main().catch(err=>{console.error(err); process.exit(1);});
