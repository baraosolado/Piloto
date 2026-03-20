import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(root, ".env") });
config({ path: path.join(root, ".env.local"), override: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não encontrada (.env.local ou .env).");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

try {
  const ping = await pool.query(
    "SELECT current_database() AS db, current_user AS role, now() AS server_time"
  );
  console.log("Conexão PostgreSQL: OK");
  console.log("  Banco:", ping.rows[0].db);
  console.log("  Role:", ping.rows[0].role);
  console.log("  Hora do servidor:", ping.rows[0].server_time);

  const tables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  console.log("  Tabelas em public:", tables.rows.length);
  if (tables.rows.length) {
    console.log(" ", tables.rows.map((t) => t.table_name).join(", "));
  } else {
    console.log("  (nenhuma — rode as migrations: npm run db:migrate)");
  }
} catch (e) {
  const err = /** @type {Error & { code?: string }} */ (e);
  console.error("Falha na conexão:", err.message);
  if (err.code) console.error("  Código:", err.code);
  process.exit(1);
} finally {
  await pool.end();
}
