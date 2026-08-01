import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run the Neon migration.");
}

const migrationsUrl = new URL("../drizzle/neon/", import.meta.url);
const migrationFiles = (await readdir(fileURLToPath(migrationsUrl)))
  .filter((file) => /^\d+.*\.sql$/i.test(file))
  .sort((left, right) => left.localeCompare(right));

if (migrationFiles.length === 0) {
  throw new Error("No Neon migration files were found.");
}

const sql = neon(databaseUrl);
await sql.query(
  `CREATE TABLE IF NOT EXISTS "__lampman_migrations" (
    "filename" text PRIMARY KEY NOT NULL,
    "applied_at" timestamptz NOT NULL DEFAULT now()
  )`,
  [],
);
const appliedRows = await sql.query(
  `SELECT "filename" FROM "__lampman_migrations"`,
  [],
);
const appliedFiles = new Set(appliedRows.map((row) => row.filename));
let appliedStatements = 0;
let appliedFileCount = 0;
for (const file of migrationFiles) {
  if (appliedFiles.has(file)) continue;

  const migration = await readFile(new URL(file, migrationsUrl), "utf8");
  const statements = migration
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement, []);
    appliedStatements += 1;
  }

  await sql.query(
    `INSERT INTO "__lampman_migrations" ("filename") VALUES ($1)`,
    [file],
  );
  appliedFileCount += 1;
}

console.log(
  `Applied ${appliedStatements} Neon migration statements from ${appliedFileCount} new file(s); ${migrationFiles.length - appliedFileCount} already applied.`,
);
