import { runWithAppUserId } from "@/db/run-with-app-user-id";

/**
 * Carrega dados no mesmo contexto Postgres que as APIs (`app.current_user_id` + `getRequestDb()`),
 * para Server Components alinharem com RLS quando estiver ativo.
 */
export function loadForAppUser<T>(
  userId: string,
  loader: () => Promise<T>,
): Promise<T> {
  return runWithAppUserId(userId, () => loader());
}
