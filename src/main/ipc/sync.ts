import { ipcMain } from 'electron';
import { syncService } from '../services/SyncService';
import { storageService } from '../services/StorageService';

export function registerSyncHandlers() {
  ipcMain.handle('sync:now', async () => {
    return await syncService.sync();
  });

  ipcMain.handle('sync:status', async () => {
    return {
      lastSyncAt: storageService.getSyncMeta()?.lastSyncAt,
      queueSize: storageService.getSyncQueue().length
    };
  });
}
