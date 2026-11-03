import { Database } from 'bun:sqlite';
import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { mkdirSync, readFileSync } from 'fs';
import path from 'path';
import * as schema from './schema';
import { seedDatabase } from './seed';

export type AppDatabase = BunSQLiteDatabase<typeof schema>;

export const DB_PATH = process.env.DB_PATH || path.resolve(import.meta.dir, '../../finance.db');
const MIGRATIONS_FOLDER = path.resolve(import.meta.dir, '../../drizzle');

let sqliteDb: Database | null = null;
let dbInstance: AppDatabase | null = null;

function assertNotLegacyDatabase(sqlite: Database) {
  const hasTables = sqlite.query(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'wallets'`).get();
  const hasMigrations = sqlite.query(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'`).get();
  if (hasTables && !hasMigrations) {
    throw new Error(
      `La base ${DB_PATH} a été créée avec l'ancien schéma non versionné et n'est plus compatible. ` +
      'Restaurez une sauvegarde récente depuis backend/backups/.',
    );
  }
}

/**
 * Copie de sécurité d'une base existante avant d'y appliquer des migrations en attente.
 * Même nommage que les sauvegardes quotidiennes, qui en assurent la rotation.
 */
function backupBeforeMigrations(sqlite: Database) {
  if (DB_PATH === ':memory:') return;
  const hasMigrations = sqlite.query(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'`).get();
  if (!hasMigrations) return;

  const journal = JSON.parse(readFileSync(path.join(MIGRATIONS_FOLDER, 'meta/_journal.json'), 'utf8')) as { entries: unknown[] };
  const applied = (sqlite.query('SELECT count(*) AS n FROM __drizzle_migrations').get() as { n: number }).n;
  if (applied >= journal.entries.length) return;

  const dir = process.env.BACKUP_DIR || path.resolve(path.dirname(DB_PATH), 'backups');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const target = path.join(dir, `finance-${stamp}-avant-migration.db`);
  sqlite.query('VACUUM INTO ?').run(target);
  console.log(`[Migrations] ${journal.entries.length - applied} migration(s) en attente, sauvegarde préalable : ${target}`);
}

export function getSqlite(): Database {
  getDatabase();
  return sqliteDb!;
}

export function getDatabase(): AppDatabase {
  if (!dbInstance) {
    const sqlite = new Database(DB_PATH, { create: true });
    sqlite.exec('PRAGMA journal_mode = WAL;');
    sqlite.exec('PRAGMA foreign_keys = ON;');
    sqlite.exec('PRAGMA busy_timeout = 5000;');

    assertNotLegacyDatabase(sqlite);

    const db = drizzle(sqlite, { schema });
    backupBeforeMigrations(sqlite);
    migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    seedDatabase(db);

    sqliteDb = sqlite;
    dbInstance = db;
    // Import différé : le service d'audit dépend lui-même de getDatabase().
    require('../services/auditService').auditService.ensureStarted();
  }
  return dbInstance;
}

/**
 * Exécute `fn` dans une transaction SQLite : tout est écrit, ou rien.
 * Les appels imbriqués utilisent des savepoints.
 */
export function withTransaction<T>(fn: () => T): T {
  return getSqlite().transaction(fn)();
}

export { schema };
