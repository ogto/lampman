import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function connectionString(): string | null {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    null
  );
}

export function hasDatabaseConfiguration(): boolean {
  return connectionString() !== null;
}

function createClient() {
  const url = connectionString();
  if (!url) {
    throw new Error(
      "블로그 데이터베이스가 연결되지 않았습니다. Vercel 프로젝트에 DATABASE_URL을 설정해 주세요.",
    );
  }

  const sql = neon(url);
  return {
    sql,
    db: drizzle(sql, { schema }),
  };
}

let client: ReturnType<typeof createClient> | null = null;

function getClient(): ReturnType<typeof createClient> {
  if (!client) client = createClient();
  return client;
}

/**
 * Intentionally lazy: Next.js evaluates server modules while building, before a
 * Vercel Marketplace database may have injected DATABASE_URL.
 */
export function getDb() {
  return getClient().db;
}

export function getSql() {
  return getClient().sql;
}
