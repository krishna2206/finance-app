import { mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import path from 'path';
import { DB_PATH, getSqlite } from '../db/index';

const BACKUP_DIR = process.env.BACKUP_DIR || path.resolve(path.dirname(DB_PATH), 'backups');
const BACKUP_RETENTION = Number(process.env.BACKUP_RETENTION ?? 30);
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const BACKUP_PREFIX = 'finance-';

function listBackups(): string[] {
  try {
    return readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith(BACKUP_PREFIX) && f.endsWith('.db'))
      .sort();
  } catch {
    return [];
  }
}

function timestamp(d = new Date()): string {
  return d.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export const backupService = {
  /**
   * Instantané cohérent de la base (VACUUM INTO gère correctement le mode WAL),
   * puis suppression des sauvegardes au-delà de la rétention.
   */
  createBackup(): string {
    mkdirSync(BACKUP_DIR, { recursive: true });
    const target = path.join(BACKUP_DIR, `${BACKUP_PREFIX}${timestamp()}.db`);
    getSqlite().query('VACUUM INTO ?').run(target);

    const backups = listBackups();
    for (const old of backups.slice(0, Math.max(0, backups.length - BACKUP_RETENTION))) {
      unlinkSync(path.join(BACKUP_DIR, old));
    }
    return target;
  },

  /** Sauvegarde au démarrage si la dernière date de plus de 24 h, puis toutes les 24 h. */
  startSchedule(): void {
    const runSafely = () => {
      try {
        const file = this.createBackup();
        console.log(`[Backup] Sauvegarde créée : ${file}`);
      } catch (err) {
        console.error('[Backup] Échec de la sauvegarde :', err);
      }
    };

    const last = listBackups().at(-1);
    const lastAge = last ? Date.now() - statSync(path.join(BACKUP_DIR, last)).mtimeMs : Infinity;
    if (lastAge >= BACKUP_INTERVAL_MS) runSafely();

    setInterval(runSafely, BACKUP_INTERVAL_MS);
  },

  getBackupDir(): string {
    return BACKUP_DIR;
  },
};
