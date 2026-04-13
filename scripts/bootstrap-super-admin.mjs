/**
 * Cria o primeiro utilizador `super_admin` quando a BD ainda não tem nenhum.
 * Produção / primeiro deploy (não substitui `db:seed:dev-users` em dev).
 *
 * Variáveis:
 *   INITIAL_SUPER_ADMIN_EMAIL    — e-mail de login inicial
 *   INITIAL_SUPER_ADMIN_PASSWORD — senha inicial (mín. 12 caracteres)
 *   INITIAL_SUPER_ADMIN_NAME     — opcional (default: "Administrador")
 *
 * Idempotente: se já existir pelo menos um `users.role = 'super_admin'`, sai 0 sem alterar nada.
 *
 * Docker: o entrypoint só executa quando `BOOTSTRAP_SUPER_ADMIN=1` (ver docker-entrypoint.sh).
 * Manual: `npm run db:bootstrap:super-admin` (DATABASE_URL + INITIAL_* no .env ou ambiente).
 */

import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";

const { Pool } = pg;

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(root, ".env") });
config({ path: path.join(root, ".env.local"), override: true });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[bootstrap-super-admin] DATABASE_URL ausente.");
    return 1;
  }

  const pool = new Pool({ connectionString: url });
  try {
    const { rows: existsRows } = await pool.query(
      `SELECT 1 FROM users WHERE role = 'super_admin' LIMIT 1`,
    );
    if (existsRows.length > 0) {
      console.log(
        "[bootstrap-super-admin] Já existe super_admin — bootstrap ignorado (idempotente).",
      );
      console.log(
        "[bootstrap-super-admin] As variáveis INITIAL_* não criam utilizador neste caso; faça login com a conta super_admin que já está na base de dados.",
      );
      return 0;
    }

    const emailRaw = process.env.INITIAL_SUPER_ADMIN_EMAIL?.trim();
    /** Trim evita falha de login quando o painel (Easypanel) acrescenta espaço/newline ao valor. */
    const password = (process.env.INITIAL_SUPER_ADMIN_PASSWORD ?? "").trim();
    const name =
      process.env.INITIAL_SUPER_ADMIN_NAME?.trim() || "Administrador";

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
    if (!emailRaw || !emailRe.test(emailRaw)) {
      console.error(
        "[bootstrap-super-admin] INITIAL_SUPER_ADMIN_EMAIL inválido ou vazio (necessário na primeira subida).",
      );
      return 1;
    }
    if (password.length < 12) {
      console.error(
        "[bootstrap-super-admin] INITIAL_SUPER_ADMIN_PASSWORD deve ter pelo menos 12 caracteres.",
      );
      return 1;
    }

    const emailLower = emailRaw.toLowerCase();

    const dup = await pool.query(
      `SELECT 1 FROM users WHERE lower(email) = $1 LIMIT 1`,
      [emailLower],
    );
    if (dup.rows.length > 0) {
      console.error(
        "[bootstrap-super-admin] Este e-mail já está registado. Use outro INITIAL_SUPER_ADMIN_EMAIL.",
      );
      return 1;
    }

    const id = randomUUID();
    const passwordHash = await hashPassword(password);

    await pool.query("BEGIN");
    try {
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, email_verified, role, banned, created_at, updated_at)
         VALUES ($1, $2, $3, NULL, true, 'super_admin', false, now(), now())`,
        [id, name, emailLower],
      );
      await pool.query(
        `INSERT INTO accounts (id, provider_id, account_id, user_id, password, created_at, updated_at)
         VALUES (gen_random_uuid(), 'credential', $1, $2, $3, now(), now())`,
        [id, id, passwordHash],
      );
      await pool.query("COMMIT");
    } catch (inner) {
      await pool.query("ROLLBACK").catch(() => {});
      throw inner;
    }

    console.log(
      "[bootstrap-super-admin] Primeiro super_admin criado. Altere e-mail/senha após login (Configurações / recuperar senha).",
    );
    console.log(`[bootstrap-super-admin] E-mail: ${emailLower}`);
    return 0;
  } catch (e) {
    const err = /** @type {Error & { code?: string }} */ (e);
    console.error("[bootstrap-super-admin] Falha:", err.message);
    if (err.code) console.error("  Código:", err.code);
    return 1;
  } finally {
    await pool.end();
  }
}

main().then((code) => process.exit(code));
