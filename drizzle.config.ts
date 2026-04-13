import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// `.env.local` primeiro; nunca `override: true` — no contentor não pode apagar
// `DATABASE_URL` já definida pelo Easypanel (ficheiros vazios / inject env (0)).
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
