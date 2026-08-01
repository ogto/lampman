CREATE TABLE `ai_generation_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ai_generation_logs_user_created_at` ON `ai_generation_logs` (`user_id`,`created_at`);