CREATE TABLE IF NOT EXISTS "blog_posts" (
  "id" text PRIMARY KEY NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "excerpt" text NOT NULL,
  "content" text NOT NULL,
  "city" text DEFAULT '대전·청주' NOT NULL,
  "service" text DEFAULT '전기안전 가이드' NOT NULL,
  "image_key" text,
  "image_alt" text DEFAULT '' NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "seo_title" text NOT NULL,
  "seo_description" text NOT NULL,
  "ai_model" text,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "blog_posts_status_check" CHECK ("status" IN ('draft', 'published'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_blog_posts_status_published_at"
  ON "blog_posts" ("status", "published_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_generation_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_generation_logs_user_created_at"
  ON "ai_generation_logs" ("user_id", "created_at");
