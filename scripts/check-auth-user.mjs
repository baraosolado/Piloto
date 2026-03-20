import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(root, ".env.local"), override: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const email = process.argv[2] || "emersonlincoln4@gmail.com";

const u = await pool.query(`SELECT id, email, name, email_verified FROM users WHERE email = $1`, [
  email,
]);
console.log("user:", u.rows[0] || "NOT FOUND");
if (u.rows[0]) {
  const a = await pool.query(
    `SELECT id, provider_id, account_id, user_id, password IS NOT NULL AS has_pw FROM accounts WHERE user_id = $1`,
    [u.rows[0].id],
  );
  console.log("accounts:", a.rows);
}
await pool.end();
