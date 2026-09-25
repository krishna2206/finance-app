import { createApp } from './app';
import { getDatabase } from './db/index';
import { getAccessToken, getAccessTokenLocation } from './lib/auth';
import { backupService } from './services/backupService';

getDatabase();

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4880;
const hostname = process.env.HOST || '0.0.0.0';

getAccessToken();
backupService.startSchedule();

console.log(`Backend API : http://localhost:${port}`);
console.log(`Jeton d'accès : ${getAccessTokenLocation()}`);
console.log(`Sauvegardes : ${backupService.getBackupDir()}`);

export default {
  port,
  hostname,
  fetch: createApp().fetch,
  development: process.env.NODE_ENV !== 'production',
  // Les flux SSE restent ouverts : on désactive le délai d'inactivité de Bun.
  idleTimeout: 0,
};
