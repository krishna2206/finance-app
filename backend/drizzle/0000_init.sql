CREATE TABLE `budget_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`budget_id` text NOT NULL,
	`category_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budget_categories_budget_category_unique` ON `budget_categories` (`budget_id`,`category_id`);--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`monthly_limit` integer DEFAULT 0 NOT NULL,
	`color` text DEFAULT '#10B981' NOT NULL,
	`icon` text DEFAULT 'PieChartBoldIcon' NOT NULL,
	`is_essential` integer DEFAULT 0 NOT NULL,
	`is_fixed` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'EXPENSE' NOT NULL,
	`color` text DEFAULT '#34D399' NOT NULL,
	`icon` text DEFAULT 'TagBoldIcon' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `savings` (
	`id` text PRIMARY KEY NOT NULL,
	`wallet_id` text NOT NULL,
	`name` text NOT NULL,
	`mode` text DEFAULT 'VIRTUAL_LOCK' NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`color` text DEFAULT '#10B981' NOT NULL,
	`icon` text DEFAULT 'ShieldCheckBoldIcon' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `savings_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`savings_id` text NOT NULL,
	`name` text NOT NULL,
	`target_amount` integer NOT NULL,
	`current_amount` integer DEFAULT 0 NOT NULL,
	`deadline` text,
	`priority` text DEFAULT 'MEDIUM' NOT NULL,
	`status` text DEFAULT 'IN_PROGRESS' NOT NULL,
	`color` text DEFAULT '#3B82F6' NOT NULL,
	`icon` text DEFAULT 'TargetBoldIcon' NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`savings_id`) REFERENCES `savings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_name` text DEFAULT 'Utilisateur' NOT NULL,
	`user_profession` text,
	`user_location` text,
	`monthly_income_target` integer DEFAULT 0 NOT NULL,
	`monthly_savings_target` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'MGA' NOT NULL,
	`onboarding_completed` integer DEFAULT 0 NOT NULL,
	`gemini_api_key` text,
	`sms_capture_enabled` integer DEFAULT 1 NOT NULL,
	`push_notifications_enabled` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transaction_items` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`category_id` text,
	`name` text NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit_price` integer,
	`total_price` integer NOT NULL,
	`unit` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`flow` text NOT NULL,
	`operation_type` text NOT NULL,
	`wallet_id` text NOT NULL,
	`destination_wallet_id` text,
	`savings_id` text,
	`goal_id` text,
	`category_id` text,
	`budget_id` text,
	`amount` integer NOT NULL,
	`fee_amount` integer DEFAULT 0 NOT NULL,
	`total_amount` integer NOT NULL,
	`title` text NOT NULL,
	`recipient` text,
	`sender` text,
	`date` text NOT NULL,
	`note` text,
	`source` text DEFAULT 'MANUAL' NOT NULL,
	`external_ref` text,
	`place_name` text,
	`latitude` real,
	`longitude` real,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`destination_wallet_id`) REFERENCES `wallets`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`savings_id`) REFERENCES `savings`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`goal_id`) REFERENCES `savings_goals`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_external_ref_unique` ON `transactions` (`external_ref`);--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`date`);--> statement-breakpoint
CREATE INDEX `transactions_wallet_idx` ON `transactions` (`wallet_id`);--> statement-breakpoint
CREATE INDEX `transactions_budget_idx` ON `transactions` (`budget_id`);--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'CUSTOM' NOT NULL,
	`account_number` text,
	`balance` integer DEFAULT 0 NOT NULL,
	`is_spendable` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
