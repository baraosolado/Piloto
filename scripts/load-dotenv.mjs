/**
 * Carrega `.env.local` e depois `.env` sem `override: true`.
 * No Docker/Easypanel, variáveis já injectadas (ex.: DATABASE_URL) não são
 * substituídas por ficheiros vazios ou placeholders no contentor.
 *
 * Em dev local: coloque preferências em `.env.local` (carrega primeiro).
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function loadAppEnv() {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  config({ path: path.join(root, ".env.local") });
  config({ path: path.join(root, ".env") });
}
