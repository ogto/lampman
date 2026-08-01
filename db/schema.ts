import { check, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const blogPosts = pgTable(
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
    imageKeys: jsonb("image_keys")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    imageAlt: text("image_alt").notNull().default(""),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    seoTitle: text("seo_title").notNull(),
    seoDescription: text("seo_description").notNull(),
    aiModel: text("ai_model"),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "blog_posts_status_check",
      sql`${table.status} IN ('draft', 'published')`,
    ),
    index("idx_blog_posts_status_published_at").on(
      table.status,
      table.publishedAt,
    ),
  ],
);

export const aiGenerationLogs = pgTable(
  "ai_generation_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_ai_generation_logs_user_created_at").on(
      table.userId,
      table.createdAt,
    ),
  ],
);
