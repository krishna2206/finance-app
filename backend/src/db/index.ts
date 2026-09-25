import { Database } from 'bun:sqlite';
import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
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
    migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    seedDatabase(db);

    sqliteDb = sqlite;
    dbInstance = db;
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
