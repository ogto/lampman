import { env } from "cloudflare:workers";

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
  imageAlt: string;
  status: BlogStatus;
  seoTitle: string;
  seoDescription: string;
  aiModel: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DbEnv = { DB?: D1Database };

function database(): D1Database | null {
  return (env as unknown as DbEnv).DB ?? null;
}

let schemaReady: Promise<void> | null = null;

export function ensureBlogSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  const db = database();
  if (!db) return Promise.resolve();

  schemaReady = (async () => {
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS blog_posts (
        id TEXT PRIMARY KEY NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        content TEXT NOT NULL,
        city TEXT NOT NULL DEFAULT '대전·청주',
        service TEXT NOT NULL DEFAULT '전기안전 가이드',
        image_key TEXT,
        image_alt TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
        seo_title TEXT NOT NULL,
        seo_description TEXT NOT NULL,
        ai_model TEXT,
        published_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published_at
        ON blog_posts(status, published_at)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS ai_generation_logs (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_user_created_at
        ON ai_generation_logs(user_id, created_at)`),
    ]);
    await db.prepare("PRAGMA optimize").run();
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

function rowToPost(row: Record<string, unknown>): BlogRecord {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: String(row.excerpt),
    content: String(row.content),
    city: String(row.city),
    service: String(row.service),
    imageKey: row.image_key ? String(row.image_key) : null,
    imageAlt: String(row.image_alt ?? ""),
    status: row.status === "published" ? "published" : "draft",
    seoTitle: String(row.seo_title),
    seoDescription: String(row.seo_description),
    aiModel: row.ai_model ? String(row.ai_model) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listPublishedBlogPosts(): Promise<BlogRecord[]> {
  const db = database();
  if (!db) return [];
  await ensureBlogSchema();
  const result = await db
    .prepare(
      `SELECT * FROM blog_posts
       WHERE status = 'published'
       ORDER BY published_at DESC, created_at DESC`,
    )
    .all();
  return (result.results ?? []).map((row) =>
    rowToPost(row as Record<string, unknown>),
  );
}

export async function listAllBlogPosts(): Promise<BlogRecord[]> {
  const db = database();
  if (!db) return [];
  await ensureBlogSchema();
  const result = await db
    .prepare("SELECT * FROM blog_posts ORDER BY updated_at DESC")
    .all();
  return (result.results ?? []).map((row) =>
    rowToPost(row as Record<string, unknown>),
  );
}

export async function findBlogPostBySlug(
  slug: string,
): Promise<BlogRecord | null> {
  const db = database();
  if (!db) return null;
  await ensureBlogSchema();
  const row = await db
    .prepare(
      "SELECT * FROM blog_posts WHERE slug = ? AND status = 'published' LIMIT 1",
    )
    .bind(slug)
    .first();
  return row ? rowToPost(row as Record<string, unknown>) : null;
}

export async function findAnyBlogPostBySlug(slug: string): Promise<BlogRecord | null> {
  const db = database();
  if (!db) return null;
  await ensureBlogSchema();
  const row = await db
    .prepare("SELECT * FROM blog_posts WHERE slug = ? LIMIT 1")
    .bind(slug)
    .first();
  return row ? rowToPost(row as Record<string, unknown>) : null;
}

export async function findBlogPostById(id: string): Promise<BlogRecord | null> {
  const db = database();
  if (!db) return null;
  await ensureBlogSchema();
  const row = await db
    .prepare("SELECT * FROM blog_posts WHERE id = ? LIMIT 1")
    .bind(id)
    .first();
  return row ? rowToPost(row as Record<string, unknown>) : null;
}

export type NewBlogPost = Omit<
  BlogRecord,
  "id" | "createdAt" | "updatedAt" | "publishedAt" | "status"
> & { status?: BlogStatus };

export async function createBlogPost(input: NewBlogPost): Promise<string> {
  const db = database();
  if (!db) throw new Error("블로그 데이터베이스가 연결되지 않았습니다.");
  await ensureBlogSchema();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const status = input.status ?? "draft";
  const publishedAt = status === "published" ? now : null;
  await db
    .prepare(
      `INSERT INTO blog_posts (
        id, slug, title, excerpt, content, city, service, image_key, image_alt,
        status, seo_title, seo_description, ai_model, published_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.slug,
      input.title,
      input.excerpt,
      input.content,
      input.city,
      input.service,
      input.imageKey,
      input.imageAlt,
      status,
      input.seoTitle,
      input.seoDescription,
      input.aiModel,
      publishedAt,
      now,
      now,
    )
    .run();
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
  const db = database();
  if (!db) throw new Error("블로그 데이터베이스가 연결되지 않았습니다.");
  await ensureBlogSchema();
  await db
    .prepare(
      `UPDATE blog_posts SET
        slug = ?, title = ?, excerpt = ?, content = ?, city = ?, service = ?,
        image_alt = ?, seo_title = ?, seo_description = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      input.slug,
      input.title,
      input.excerpt,
      input.content,
      input.city,
      input.service,
      input.imageAlt,
      input.seoTitle,
      input.seoDescription,
      new Date().toISOString(),
      id,
    )
    .run();
}

export async function publishBlogPost(id: string): Promise<void> {
  const db = database();
  if (!db) throw new Error("블로그 데이터베이스가 연결되지 않았습니다.");
  await ensureBlogSchema();
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE blog_posts
       SET status = 'published', published_at = COALESCE(published_at, ?), updated_at = ?
       WHERE id = ?`,
    )
    .bind(now, now, id)
    .run();
}

export async function unpublishBlogPost(id: string): Promise<void> {
  const db = database();
  if (!db) throw new Error("블로그 데이터베이스가 연결되지 않았습니다.");
  await ensureBlogSchema();
  await db
    .prepare(
      `UPDATE blog_posts
       SET status = 'draft', published_at = NULL, updated_at = ?
       WHERE id = ?`,
    )
    .bind(new Date().toISOString(), id)
    .run();
}

export async function claimAiGenerationSlot(
  userId: string,
  limitPerHour = 12,
): Promise<boolean> {
  const db = database();
  if (!db) throw new Error("블로그 데이터베이스가 연결되지 않았습니다.");
  await ensureBlogSchema();

  const now = new Date();
  const cutoff = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const cleanupCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const result = await db
    .prepare("SELECT COUNT(*) AS count FROM ai_generation_logs WHERE user_id = ? AND created_at >= ?")
    .bind(userId, cutoff)
    .first<{ count: number | string }>();

  if (Number(result?.count ?? 0) >= limitPerHour) return false;

  await db.batch([
    db.prepare("INSERT INTO ai_generation_logs (id, user_id, created_at) VALUES (?, ?, ?)")
      .bind(crypto.randomUUID(), userId, now.toISOString()),
    db.prepare("DELETE FROM ai_generation_logs WHERE created_at < ?")
      .bind(cleanupCutoff),
  ]);
  return true;
}
