import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const blogPosts = sqliteTable(
  "blog_posts",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    content: text("content").notNull(),
    city: text("city").notNull().default("대전·청주"),
    service: text("service").notNull().default("전기안전 가이드"),
    imageKey: text("image_key"),
    imageAlt: text("image_alt").notNull().default(""),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    seoTitle: text("seo_title").notNull(),
    seoDescription: text("seo_description").notNull(),
    aiModel: text("ai_model"),
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_blog_posts_status_published_at").on(
      table.status,
      table.publishedAt,
    ),
  ],
);

export const aiGenerationLogs = sqliteTable(
  "ai_generation_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_ai_generation_logs_user_created_at").on(
      table.userId,
      table.createdAt,
    ),
  ],
);
