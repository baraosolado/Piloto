/**
 * Carrega `.env.local` e depois `.env` (só se o ficheiro existir), sem `override: true`.
 * No Docker/Easypanel, variáveis já injectadas (ex.: DATABASE_URL) não são substituídas.
 *
 * No Easypanel costuma existir só `.env` ou só variáveis no painel — `.env.local` é opcional.
 */
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function loadAppEnv() {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const opts = { quiet: true };
  const local = path.join(root, ".env.local");
  const env = path.join(root, ".env");
  if (fs.existsSync(local)) config({ path: local, ...opts });
  if (fs.existsSync(env)) config({ path: env, ...opts });
}
