/**
 * Cria (ou recria) contas locais para desenvolvimento:
 * - Desenvolvedor / mestre: emersonlincoln4@gmail.com
 * - Mestre (piloto.local): dev@piloto.local
 * - Usuário (motorista): motorista@copilote.local
 *
 * Uso: npm run db:seed:dev-users
 *
 * Remove utilizadores de dev por **e-mail** ou pelos **UUID fixos** (evita 23505 se o
 * e-mail no BD for antigo, ex. motorista@piloto.local com o mesmo id da migration 0002).
 */

import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";

const { Pool } = pg;

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(root, ".env") });
config({ path: path.join(root, ".env.local"), override: true });

/** IDs fixos (iguais à migration `0002_seed_dev_users_piloto.sql`) */
const DEV_USERS = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    email: "emersonlincoln4@gmail.com",
    name: "Dev Copilote",
    password: "CopiloteDev2026!",
    role: "desenvolvedor",
  },
  {
    id: "33333333-3333-4333-8333-333333333303",
    email: "dev@piloto.local",
    name: "Dev Piloto (mestre)",
    password: "CopiloteDev2026!",
    role: "super_admin (dev@piloto.local)",
  },
  {
    id: "22222222-2222-4222-8222-222222222202",
    email: "motorista@copilote.local",
    name: "João Motorista",
    password: "CopiloteUser2026!",
    role: "usuário (motorista)",
  },
];

/** Papel Better Auth na tabela `users.role`. */
function authRoleForEmail(email) {
  const e = email.toLowerCase();
  if (e === "emersonlincoln4@gmail.com" || e === "dev@piloto.local") {
    return "super_admin";
  }
  return "user";
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não encontrada (.env.local ou .env).");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

try {
  const emails = DEV_USERS.map((u) => u.email.toLowerCase());
  const ids = DEV_USERS.map((u) => u.id);

  const del = await pool.query(
    `DELETE FROM users
     WHERE id = ANY($1::uuid[])
        OR lower(email) = ANY($2::text[])
     RETURNING email`,
    [ids, emails],
  );
  if (del.rowCount > 0) {
    console.log(
      "Removidos usuários anteriores:",
      del.rows.map((r) => r.email).join(", "),
    );
  }

  console.log("\nCriando contas de desenvolvimento...\n");

  for (const u of DEV_USERS) {
    const id = u.id;
    const emailLower = u.email.toLowerCase();
    const passwordHash = await hashPassword(u.password);

    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, email_verified, role, banned, created_at, updated_at)
       VALUES ($1, $2, $3, NULL, true, $4, false, now(), now())`,
      [id, u.name, emailLower, authRoleForEmail(u.email)],
    );

    await pool.query(
      `INSERT INTO accounts (id, provider_id, account_id, user_id, password, created_at, updated_at)
       VALUES (gen_random_uuid(), 'credential', $1, $2, $3, now(), now())`,
      [id, id, passwordHash],
    );

    console.log(`  [${u.role}]`);
    console.log(`    E-mail:    ${emailLower}`);
    console.log(`    Senha:     ${u.password}`);
    console.log(`    User ID:   ${id}\n`);
  }

  console.log("Pronto. Faça login em /login com qualquer uma das contas acima.");
} catch (e) {
  const err = /** @type {Error & { code?: string }} */ (e);
  console.error("Falha no seed:", err.message);
  if (err.code) console.error("  Código:", err.code);
  process.exit(1);
} finally {
  await pool.end();
}
