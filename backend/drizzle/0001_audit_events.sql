CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`occurred_at` integer NOT NULL,
	`actor` text NOT NULL,
	`domain` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`summary` text NOT NULL,
	`before` text,
	`after` text,
	`wallet_changes` text,
	`drift` integer,
	`note` text
);
--> statement-breakpoint
CREATE INDEX `audit_events_occurred_idx` ON `audit_events` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_events_entity_idx` ON `audit_events` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_events_domain_idx` ON `audit_events` (`domain`);