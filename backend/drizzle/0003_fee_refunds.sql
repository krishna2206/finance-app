ALTER TABLE `settings` ADD `mvola_app_cashback_percent` integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `fee_refund_amount` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `withdrawal_fee_covered` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `counterparty_operator` text;