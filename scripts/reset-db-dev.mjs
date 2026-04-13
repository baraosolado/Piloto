/**
 * Apaga todas as tabelas e tipos em `public` (PostgreSQL) e deixa o schema vazio.
 * Depois corra: npm run db:migrate
 *
 * NUNCA em produção sem backup. Uso típico: dev local ou BD de teste descartável.
 *
 *   CONFIRM_RESET_DB=yes npm run db:reset
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadAppEnv } from "./load-dotenv.mjs";

const { Pool } = pg;

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
loadAppEnv();

if (process.env.CONFIRM_RESET_DB?.trim() !== "yes") {
  console.error(
    "[reset-db] Recusa: define CONFIRM_RESET_DB=yes para apagar todos os dados em public.",
  );
  console.error(
    "[reset-db] Exemplo (PowerShell): $env:CONFIRM_RESET_DB='yes'; npm run db:reset",
  );
  console.error(
    "[reset-db] Exemplo (bash):     CONFIRM_RESET_DB=yes npm run db:reset",
  );
  process.exit(1);
}

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("[reset-db] DATABASE_URL ausente (.env ou .env.local).");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
let exitCode = 0;

try {
  const who = await pool.query(
    "SELECT current_database() AS db, current_user AS role",
  );
  console.log(
    `[reset-db] A apagar schema public em "${who.rows[0].db}" como "${who.rows[0].role}"…`,
  );

  await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
  await pool.query("CREATE SCHEMA public");
  await pool.query("GRANT ALL ON SCHEMA public TO PUBLIC");

  console.log("[reset-db] OK — schema public recriado vazio.");
  console.log("[reset-db] Seguinte: npm run db:migrate");
  console.log(
    "[reset-db] Opcional (dev): npm run db:seed:dev-users — ou BOOTSTRAP_SUPER_ADMIN em produção.",
  );
} catch (e) {
  const err = /** @type {Error} */ (e);
  console.error("[reset-db] Falha:", err.message);
  exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
process.exit(exitCode);
