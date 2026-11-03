ALTER TABLE `categories` ADD `category_group` text DEFAULT 'DAILY' NOT NULL;--> statement-breakpoint
-- Refonte des catégories (données). Les catégories système sont ensuite remises à jour par le seed.
-- Trace au journal (seulement si le journal a déjà démarré, c'est-à-dire sur une base existante).
INSERT INTO `audit_events` (`id`, `occurred_at`, `actor`, `domain`, `action`, `summary`, `before`, `after`)
SELECT
	lower(hex(randomblob(16))),
	CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER),
	'SYSTEM', 'SYSTEM', 'CATEGORIES_MIGRATED',
	'Refonte des catégories : ' || (SELECT count(*) FROM `transactions` t WHERE t.`category_id` IN ('cat_tools_business', 'cat_cash_withdrawal') OR (t.`destination_wallet_id` IS NOT NULL AND t.`operation_type` NOT IN ('SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL') AND t.`category_id` IS NOT 'cat_fees_mobile_money')) || ' opération(s) reclassée(s). « Outils & Business » rejoint « Abonnements & numérique », « Retrait d’espèces » rejoint « Frais bancaires & Mobile Money », et chaque transfert entre ses comptes prend la catégorie des frais.',
	(SELECT json_group_array(json_object('transactionId', t.`id`, 'categoryId', t.`category_id`)) FROM `transactions` t WHERE t.`category_id` IN ('cat_tools_business', 'cat_cash_withdrawal') OR (t.`destination_wallet_id` IS NOT NULL AND t.`operation_type` NOT IN ('SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL') AND t.`category_id` IS NOT 'cat_fees_mobile_money')),
	json_object('cat_tools_business', 'cat_subscriptions', 'cat_cash_withdrawal', 'cat_fees_mobile_money', 'transfers', 'cat_fees_mobile_money')
WHERE EXISTS (SELECT 1 FROM `audit_events`);
--> statement-breakpoint
UPDATE `categories` SET `category_group` = 'INCOME' WHERE `type` = 'INCOME';
--> statement-breakpoint
UPDATE `transactions` SET `category_id` = 'cat_subscriptions' WHERE `category_id` = 'cat_tools_business';
--> statement-breakpoint
UPDATE `transactions` SET `category_id` = 'cat_fees_mobile_money' WHERE `category_id` = 'cat_cash_withdrawal';
--> statement-breakpoint
UPDATE `transactions` SET `category_id` = 'cat_fees_mobile_money'
WHERE `destination_wallet_id` IS NOT NULL AND `operation_type` NOT IN ('SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL');
--> statement-breakpoint
UPDATE `transaction_items` SET `category_id` = 'cat_subscriptions' WHERE `category_id` = 'cat_tools_business';
--> statement-breakpoint
UPDATE `transaction_items` SET `category_id` = 'cat_fees_mobile_money' WHERE `category_id` = 'cat_cash_withdrawal';
--> statement-breakpoint
INSERT OR IGNORE INTO `budget_categories` (`id`, `budget_id`, `category_id`, `created_at`)
SELECT lower(hex(randomblob(16))), `budget_id`, CASE `category_id` WHEN 'cat_tools_business' THEN 'cat_subscriptions' ELSE 'cat_fees_mobile_money' END, `created_at`
FROM `budget_categories` WHERE `category_id` IN ('cat_tools_business', 'cat_cash_withdrawal');
--> statement-breakpoint
DELETE FROM `budget_categories` WHERE `category_id` IN ('cat_tools_business', 'cat_cash_withdrawal');
--> statement-breakpoint
DELETE FROM `categories` WHERE `id` IN ('cat_tools_business', 'cat_cash_withdrawal');
--> statement-breakpoint
-- Une opération ne garde son enveloppe que si celle-ci couvre sa (nouvelle) catégorie.
UPDATE `transactions` SET `budget_id` = NULL
WHERE `budget_id` IS NOT NULL AND NOT EXISTS (
	SELECT 1 FROM `budget_categories` bc WHERE bc.`budget_id` = `transactions`.`budget_id` AND bc.`category_id` = `transactions`.`category_id`
);
