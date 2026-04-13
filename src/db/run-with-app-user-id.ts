import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { pool } from "./index";
import * as schema from "@/db/schema";
import { runWithRequestDb } from "@/db/request-db";

export type AppScopedDb = NodePgDatabase<typeof schema>;

/**
 * Executa `fn` numa transação com `app.current_user_id` definido (via `set_config`, escopo local).
 * Expõe o mesmo cliente em `getRequestDb()` para libs partilhadas (ver `src/db/request-db.ts`).
 * Necessário quando o Postgres tiver RLS ativo (migração `0008_enable_row_level_security.sql`).
 */
export async function runWithAppUserId<T>(
  userId: string,
  fn: (scopedDb: AppScopedDb) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [
      userId,
    ]);
    const scopedDb = drizzle(client, { schema });
    const result = await runWithRequestDb(scopedDb, () => fn(scopedDb));
    await client.query("COMMIT");
    return result;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore rollback errors */
    }
    throw e;
  } finally {
    client.release();
  }
}
