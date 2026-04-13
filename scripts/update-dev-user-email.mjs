/**
 * Atualiza o e-mail do usuário dev no banco (ex.: trocar dev@copilote.local por um Gmail real).
 * Uso: node scripts/update-dev-user-email.mjs [de] [para]
 * Default: dev@copilote.local → emersonlincoln4@gmail.com
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadAppEnv } from "./load-dotenv.mjs";

const { Pool } = pg;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
loadAppEnv();

const fromEmail = (process.argv[2] || "dev@copilote.local").toLowerCase();
const toEmail = (process.argv[3] || "emersonlincoln4@gmail.com").toLowerCase();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não encontrada (.env.local ou .env).");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

try {
  const clash = await pool.query(`SELECT id FROM users WHERE lower(email) = $1`, [toEmail]);
  if (clash.rows.length > 0) {
    console.error(
      `Já existe usuário com e-mail ${toEmail} (id: ${clash.rows[0].id}). Remova ou use outro destino.`,
    );
    process.exit(1);
  }

  const r = await pool.query(
    `UPDATE users SET email = $1, updated_at = now() WHERE lower(email) = $2 RETURNING id, email, name`,
    [toEmail, fromEmail],
  );

  if (r.rowCount === 0) {
    console.error(`Nenhum usuário com e-mail ${fromEmail}. Nada alterado.`);
    process.exit(1);
  }

  console.log("Atualizado:", r.rows[0]);
  console.log(`Login em /login: ${toEmail} (mesma senha de antes).`);
} catch (e) {
  const err = /** @type {Error & { code?: string }} */ (e);
  console.error("Falha:", err.message);
  if (err.code) console.error("Código:", err.code);
  process.exit(1);
} finally {
  await pool.end();
}
