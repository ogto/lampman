import { and, desc, eq, sql as drizzleSql } from "drizzle-orm";
import { getDb, getSql, hasDatabaseConfiguration } from "./index";
import { blogPosts } from "./schema";

export type BlogStatus = "draft" | "published";

export type BlogRecord = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  city: string;
  service: string;
  imageKey: string | null;
  imageKeys: string[];
  imageAlt: string;
  status: BlogStatus;
  seoTitle: string;
  seoDescription: string;
  aiModel: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

let schemaReady: Promise<void> | null = null;

export function ensureBlogSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  if (!hasDatabaseConfiguration()) return Promise.resolve();

  schemaReady = (async () => {
    const sql = getSql();
    await sql`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id TEXT PRIMARY KEY NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        content TEXT NOT NULL,
        city TEXT NOT NULL DEFAULT '대전·청주',
        service TEXT NOT NULL DEFAULT '전기안전 가이드',
        image_key TEXT,
        image_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
        image_alt TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'draft'
          CONSTRAINT blog_posts_status_check CHECK (status IN ('draft', 'published')),
        seo_title TEXT NOT NULL,
        seo_description TEXT NOT NULL,
        ai_model TEXT,
        published_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published_at
      ON blog_posts(status, published_at)
    `;
    await sql`
      ALTER TABLE blog_posts
      ADD COLUMN IF NOT EXISTS image_keys JSONB NOT NULL DEFAULT '[]'::jsonb
    `;
    await sql`
      UPDATE blog_posts
      SET image_keys = jsonb_build_array(image_key)
      WHERE image_key IS NOT NULL
        AND BTRIM(image_key) <> ''
        AND image_keys = '[]'::jsonb
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS ai_generation_logs (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_user_created_at
      ON ai_generation_logs(user_id, created_at)
    `;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

type BlogRow = typeof blogPosts.$inferSelect;

function normalizeImageKeys(
  imageKeys: unknown,
  imageKey: string | null | undefined,
): string[] {
  const cover = imageKey?.trim() || null;
  const gallery = Array.isArray(imageKeys)
    ? imageKeys.filter((value): value is string => typeof value === "string")
    : [];
  const candidates = cover ? [cover, ...gallery] : gallery;
  return [...new Set(candidates.map((value) => value.trim()).filter(Boolean))];
}

function rowToPost(row: BlogRow): BlogRecord {
  const imageKeys = normalizeImageKeys(row.imageKeys, row.imageKey);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    city: row.city,
    service: row.service,
    imageKey: row.imageKey?.trim() || imageKeys[0] || null,
    imageKeys,
    imageAlt: row.imageAlt,
    status: row.status === "published" ? "published" : "draft",
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    aiModel: row.aiModel,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listPublishedBlogPosts(): Promise<BlogRecord[]> {
  if (!hasDatabaseConfiguration()) return [];
  await ensureBlogSchema();
  const rows = await getDb()
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"))
    .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt));
  return rows.map(rowToPost);
}

export async function listAllBlogPosts(): Promise<BlogRecord[]> {
  if (!hasDatabaseConfiguration()) return [];
  await ensureBlogSchema();
  const rows = await getDb()
    .select()
    .from(blogPosts)
    .orderBy(desc(blogPosts.updatedAt));
  return rows.map(rowToPost);
}

export async function findBlogPostBySlug(
  slug: string,
): Promise<BlogRecord | null> {
  if (!hasDatabaseConfiguration()) return null;
  await ensureBlogSchema();
  const rows = await getDb()
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
    .limit(1);
  return rows[0] ? rowToPost(rows[0]) : null;
}

export async function findAnyBlogPostBySlug(
  slug: string,
): Promise<BlogRecord | null> {
  if (!hasDatabaseConfiguration()) return null;
  await ensureBlogSchema();
  const rows = await getDb()
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);
  return rows[0] ? rowToPost(rows[0]) : null;
}

export async function findBlogPostById(id: string): Promise<BlogRecord | null> {
  if (!hasDatabaseConfiguration()) return null;
  await ensureBlogSchema();
  const rows = await getDb()
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.id, id))
    .limit(1);
  return rows[0] ? rowToPost(rows[0]) : null;
}

export type NewBlogPost = Omit<
  BlogRecord,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "publishedAt"
  | "status"
  | "imageKeys"
> & { imageKeys?: string[]; status?: BlogStatus };

export async function createBlogPost(input: NewBlogPost): Promise<string> {
  const db = getDb();
  await ensureBlogSchema();
  const id = crypto.randomUUID();
  const now = new Date();
  const status = input.status ?? "draft";
  const imageKeys = normalizeImageKeys(input.imageKeys, input.imageKey);
  const imageKey = input.imageKey?.trim() || imageKeys[0] || null;

  await db.insert(blogPosts).values({
    id,
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt,
    content: input.content,
    city: input.city,
    service: input.service,
    imageKey,
    imageKeys,
    imageAlt: input.imageAlt,
    status,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    aiModel: input.aiModel,
    publishedAt: status === "published" ? now : null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateBlogPost(
  id: string,
  input: Pick<
    BlogRecord,
    | "slug"
    | "title"
    | "excerpt"
    | "content"
    | "city"
    | "service"
    | "imageAlt"
    | "seoTitle"
    | "seoDescription"
  >,
): Promise<void> {
  const db = getDb();
  await ensureBlogSchema();
  await db
    .update(blogPosts)
    .set({
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt,
      content: input.content,
      city: input.city,
      service: input.service,
      imageAlt: input.imageAlt,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, id));
}

export async function publishBlogPost(id: string): Promise<void> {
  const db = getDb();
  await ensureBlogSchema();
  const now = new Date();
  await db
    .update(blogPosts)
    .set({
      status: "published",
      publishedAt: drizzleSql<Date>`COALESCE(${blogPosts.publishedAt}, ${now})`,
      updatedAt: now,
    })
    .where(eq(blogPosts.id, id));
}

export async function unpublishBlogPost(id: string): Promise<void> {
  const db = getDb();
  await ensureBlogSchema();
  await db
    .update(blogPosts)
    .set({ status: "draft", publishedAt: null, updatedAt: new Date() })
    .where(eq(blogPosts.id, id));
}

async function claimRateLimitReservation(
  scopeKey: string,
  limit: number,
  windowMs: number,
): Promise<string | null> {
  await ensureBlogSchema();

  const sql = getSql();
  const id = crypto.randomUUID();
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMs);
  const cleanupCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // The per-user advisory lock keeps the count-and-insert decision atomic even
  // when several Vercel Functions process AI requests at the same time.
  const result = await sql`
    WITH locked AS MATERIALIZED (
      SELECT
        ${scopeKey}::text AS user_id,
        pg_advisory_xact_lock(hashtextextended(${scopeKey}, 0)) AS lock_acquired
    ),
    inserted AS (
      INSERT INTO ai_generation_logs (id, user_id, created_at)
      SELECT ${id}, locked.user_id, ${now}
      FROM locked
      WHERE (
        SELECT COUNT(*)
        FROM ai_generation_logs
        WHERE user_id = locked.user_id AND created_at >= ${cutoff}
      ) < ${limit}
      RETURNING id
    ),
    cleaned AS (
      DELETE FROM ai_generation_logs WHERE created_at < ${cleanupCutoff}
    )
    SELECT EXISTS(SELECT 1 FROM inserted) AS claimed
  `;

  return result[0]?.claimed === true ? id : null;
}

export async function claimRateLimitSlot(
  scopeKey: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  return Boolean(await claimRateLimitReservation(scopeKey, limit, windowMs));
}

export function claimAiGenerationSlot(
  userId: string,
  limitPerHour = 12,
): Promise<string | null> {
  return claimRateLimitReservation(`ai-generation:${userId}`, limitPerHour, 60 * 60 * 1000);
}

export async function releaseAiGenerationSlot(
  reservationId: string,
  userId: string,
): Promise<void> {
  await ensureBlogSchema();
  const sql = getSql();
  await sql`
    DELETE FROM ai_generation_logs
    WHERE id = ${reservationId}
      AND user_id = ${`ai-generation:${userId}`}
  `;
}
