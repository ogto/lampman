import { defineConfig } from "drizzle-kit";

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  "postgresql://missing:missing@localhost:5432/missing";

export default defineConfig({
  out: "./drizzle/neon",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
