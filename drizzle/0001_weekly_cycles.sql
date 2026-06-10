CREATE TABLE `weekly_cycles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week` text NOT NULL,
	`goal_content` text DEFAULT '' NOT NULL,
	`review_content` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekly_cycles_week_unique` ON `weekly_cycles` (`week`);--> statement-breakpoint
DROP TABLE `goals`;--> statement-breakpoint
DROP TABLE `reviews`;
