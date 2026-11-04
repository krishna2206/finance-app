CREATE TABLE `budget_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`budget_id` text NOT NULL,
	`period` text NOT NULL,
	`monthly_limit` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budget_limits_budget_period_unique` ON `budget_limits` (`budget_id`,`period`);--> statement-breakpoint
ALTER TABLE `budgets` ADD `archived_at` integer;--> statement-breakpoint
-- Plafond actuel de chaque enveloppe existante, à partir de son mois de création (heure de Madagascar).
INSERT INTO `budget_limits` (`id`, `budget_id`, `period`, `monthly_limit`, `created_at`)
SELECT lower(hex(randomblob(16))), `id`, strftime('%Y-%m', `created_at` / 1000 + 10800, 'unixepoch'), `monthly_limit`, `created_at`
FROM `budgets`;
