import { ipcMain } from "electron";
import { syncService } from "../services/SyncService";
import { storageService } from "../services/StorageService";
import { authService } from "../services/AuthService";

export function registerSyncHandlers() {
  ipcMain.handle("sync:now", async () => {
    await syncService.sync();
  });

  ipcMain.handle("sync:status", () => {
    return {
      lastSyncAt: storageService.getSyncMeta()?.lastSyncAt,
      queueSize: storageService.getSyncQueue().length,
    };
  });

  ipcMain.handle("sync:backupToCloud", async () => {
    const token = await authService.refreshIfNeeded();
    return await syncService.backupVaultToCloud(token);
  });

  ipcMain.handle("sync:listBackups", async () => {
    const token = await authService.refreshIfNeeded();
    return await syncService.listCloudBackups(token);
  });

  ipcMain.handle("sync:restoreFromCloud", async (_, fileId: string) => {
    const token = await authService.refreshIfNeeded();
    return await syncService.restoreVaultFromCloud(token, fileId);
  });
}
