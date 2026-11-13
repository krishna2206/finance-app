ALTER TABLE `transaction_items` ADD `budget_id` text REFERENCES budgets(id);--> statement-breakpoint
ALTER TABLE `transactions` ADD `fee_budget_id` text REFERENCES budgets(id);