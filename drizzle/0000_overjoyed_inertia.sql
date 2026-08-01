CREATE TABLE `blog_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text NOT NULL,
	`content` text NOT NULL,
	`city` text DEFAULT '대전·청주' NOT NULL,
	`service` text DEFAULT '전기안전 가이드' NOT NULL,
	`image_key` text,
	`image_alt` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`seo_title` text NOT NULL,
	`seo_description` text NOT NULL,
	`ai_model` text,
	`published_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blog_posts_slug_unique` ON `blog_posts` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_blog_posts_status_published_at` ON `blog_posts` (`status`,`published_at`);