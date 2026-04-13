import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

const dotenvOpts = { quiet: true };
const cwd = process.cwd();
const envLocal = path.join(cwd, ".env.local");
const envFile = path.join(cwd, ".env");
if (fs.existsSync(envLocal)) loadEnv({ path: envLocal, ...dotenvOpts });
if (fs.existsSync(envFile)) loadEnv({ path: envFile, ...dotenvOpts });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
