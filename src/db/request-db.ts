import { AsyncLocalStorage } from "node:async_hooks";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";
import { db as globalDb } from "./index";

export type AppDb = NodePgDatabase<typeof schema>;

const requestDbStore = new AsyncLocalStorage<AppDb>();

/**
 * Drizzle dentro de `runWithAppUserId` (mesma conexão + GUC `app.current_user_id`).
 * Fora desse contexto, devolve o pool global (Better Auth, funções SECURITY DEFINER em SQL, etc.).
 */
export function getRequestDb(): AppDb {
  return requestDbStore.getStore() ?? globalDb;
}

export function runWithRequestDb<T>(
  scopedDb: AppDb,
  fn: () => Promise<T>,
): Promise<T> {
  return requestDbStore.run(scopedDb, fn);
}
