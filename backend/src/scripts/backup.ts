import { backupService } from '../services/backupService';

const file = backupService.createBackup();
console.log(`Sauvegarde créée : ${file}`);
