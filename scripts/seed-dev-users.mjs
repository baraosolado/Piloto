/**
 * Cria (ou recria) duas contas locais para desenvolvimento:
 * - Desenvolvedor: emersonlincoln4@gmail.com
 * - Usuário (motorista): motorista@piloto.local
 *
 * Uso: npm run db:seed:dev-users
 *
 * Remove usuários existentes com esses e-mails (CASCADE apaga sessões/contas ligadas).
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
    name: "Dev Piloto",
    password: "PilotoDev2026!",
    role: "desenvolvedor",
  },
  {
    id: "22222222-2222-4222-8222-222222222202",
    email: "motorista@piloto.local",
    name: "João Motorista",
    password: "PilotoUser2026!",
    role: "usuário (motorista)",
  },
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não encontrada (.env.local ou .env).");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

try {
  const emails = DEV_USERS.map((u) => u.email);

  const del = await pool.query(
    `DELETE FROM users WHERE email = ANY($1::text[]) RETURNING email`,
    [emails],
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
      `INSERT INTO users (id, name, email, password_hash, email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, NULL, true, now(), now())`,
      [id, u.name, emailLower],
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
