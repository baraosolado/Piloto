/**
 * Depois de `drizzle-kit migrate`: confirma que `public.users` existe.
 * Evita arrancar o Next com journal `__drizzle_migrations` dessincronizado (migrate "OK" mas sem tabelas).
 *
 * Uso: node scripts/verify-db-schema.mjs (exit 1 se falhar)
 */

import pg from "pg";
import { loadAppEnv } from "./load-dotenv.mjs";

const { Pool } = pg;

loadAppEnv();
const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.log("[verify-db-schema] DATABASE_URL ausente — skip.");
  process.exit(0);
}

const pool = new Pool({ connectionString: url });
let exitCode = 0;

try {
  const { rows } = await pool.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    ) AS ok`,
  );
  if (rows[0]?.ok) {
    console.log("[verify-db-schema] Tabela public.users: OK.");
  } else {
    const j = await pool.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '__drizzle_migrations'
      ) AS has_journal`,
    );

    console.error(
      "[verify-db-schema] ERRO: public.users não existe após migrate.",
    );
    if (j.rows[0]?.has_journal) {
      console.error(
        "[verify-db-schema] O journal Drizzle (__drizzle_migrations) existe — está dessincronizado com o schema.",
      );
      console.error(
        "[verify-db-schema] Em BD descartável (com backup): DROP TABLE IF EXISTS public.__drizzle_migrations CASCADE;",
      );
      console.error(
        "[verify-db-schema] Reinicie o contentor para o migrate voltar a aplicar todas as migrations.",
      );
    } else {
      console.error(
        "[verify-db-schema] Confirme DATABASE_URL (mesmo Postgres que o Easypanel) e permissões do utilizador na BD.",
      );
    }
    exitCode = 1;
  }
} catch (e) {
  const err = /** @type {Error} */ (e);
  console.error("[verify-db-schema] Falha:", err.message);
  exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
process.exit(exitCode);
