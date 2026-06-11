PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`date` text,
	`done_at` text,
	`deleted_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_tasks`("id", "title", "date", "done_at", "deleted_at", "created_at") SELECT "id", "title", "date", "done_at", "deleted_at", "created_at" FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;