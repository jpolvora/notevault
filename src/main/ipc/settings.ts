import { ipcMain } from 'electron';
import { storageService } from '../services/StorageService';
import { UserSettings } from '../../shared/types';

export function registerSettingsHandlers() {
  ipcMain.handle('settings:load', () => {
    return storageService.getSettings();
  });

  ipcMain.on('settings:update', (_, settings: UserSettings) => {
    storageService.setSettings(settings);
    // Optionally: propagate to other windows if multi-window
  });
}
