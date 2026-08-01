ALTER TABLE "blog_posts"
  ADD COLUMN IF NOT EXISTS "image_keys" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
UPDATE "blog_posts"
SET "image_keys" = jsonb_build_array("image_key")
WHERE "image_key" IS NOT NULL
  AND BTRIM("image_key") <> ''
  AND "image_keys" = '[]'::jsonb;
