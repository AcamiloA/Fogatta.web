import { existsSync } from "node:fs";
import path from "node:path";

import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

const root = process.cwd();

const envCandidates = [".env.local", ".env"];
for (const envFile of envCandidates) {
  const envPath = path.join(root, envFile);
  if (!existsSync(envPath)) {
    continue;
  }

  // Keep first-loaded values as source of truth (.env.local before .env).
  loadEnv({ path: envPath, override: false });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
