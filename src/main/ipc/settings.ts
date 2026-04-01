import { ipcMain } from "electron";
import { storageService } from "../services/StorageService";
import { systemService } from "../services/SystemService";
import { authService } from "../services/AuthService";
import { UserSettings } from "../../shared/types";

export function registerSettingsHandlers() {
  ipcMain.handle("settings:load", () => {
    return storageService.getSettings();
  });

  ipcMain.on("settings:update", (_, settings: UserSettings) => {
    storageService.setSettings(settings);
    systemService.updateLoginSettings(settings);
    // Optionally: propagate to other windows if multi-window
  });

  ipcMain.handle(
    "google:test-config",
    async (_, clientId: string, clientSecret: string) => {
      return await authService.testConfig(clientId, clientSecret);
    },
  );
}
