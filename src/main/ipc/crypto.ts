import { ipcMain } from "electron";
import { cryptoService } from "../services/CryptoService";
import { storageService } from "../services/StorageService";

export function setupCryptoIpc() {
  ipcMain.handle("crypto:unlock", async (_, passphrase: string) => {
    try {
      const meta = storageService.getCryptoMeta();
      if (!meta) {
        // First time setting up encryption
        await cryptoService.init();
        const newMeta = {
          mode: "passphrase" as const,
          salt: cryptoService.getSalt(),
          pbkdf2Iterations: 310000,
        };
        storageService.setCryptoMeta(newMeta);
      } else {
        await cryptoService.init(meta.salt);
      }

      await cryptoService.unlock(passphrase);
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle("crypto:isUnlocked", () => {
    return cryptoService.isUnlocked();
  });

  ipcMain.handle(
    "crypto:setEncrypted",
    async (_, { tabId, encrypted }: { tabId: string; encrypted: boolean }) => {
      if (!cryptoService.isUnlocked()) {
        return { ok: false, error: "Vault is locked" };
      }

      try {
        storageService.updateTab(tabId, { encrypted });
        return { ok: true };
      } catch (error: any) {
        return { ok: false, error: error.message };
      }
    },
  );

  ipcMain.handle("crypto:getNeedsUnlock", () => {
    const tabs = storageService.getTabs();
    const hasEncryptedTabs = tabs.some((t) => t.encrypted);
    return hasEncryptedTabs && !cryptoService.isUnlocked();
  });

  ipcMain.handle("crypto:lock", () => {
    cryptoService.lock();
  });

  ipcMain.handle("crypto:exportVault", async (event) => {
    const { dialog } = require("electron");
    const win = require("electron").BrowserWindow.fromWebContents(event.sender);

    const { filePath } = await dialog.showSaveDialog(win!, {
      title: "Export Vault Backup",
      defaultPath: "notevault_backup.nvault",
      filters: [{ name: "NoteVault Backup", extensions: ["nvault"] }],
    });

    if (!filePath) return { cancelled: true };

    try {
      const tabs = storageService.getTabs();
      const settings = storageService.getSettings();
      const backup = {
        type: "notevault-backup-v1",
        tabs,
        settings,
        exportedAt: Date.now(),
      };

      require("fs").writeFileSync(filePath, JSON.stringify(backup, null, 2));
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle("crypto:importVault", async (event) => {
    const { dialog } = require("electron");
    const win = require("electron").BrowserWindow.fromWebContents(event.sender);

    const { filePaths } = await dialog.showOpenDialog(win!, {
      title: "Import Vault Backup",
      filters: [{ name: "NoteVault Backup", extensions: ["nvault"] }],
      properties: ["openFile"],
    });

    if (filePaths.length === 0) return { cancelled: true };

    try {
      const data = require("fs").readFileSync(filePaths[0], "utf8");
      const backup = JSON.parse(data);

      if (backup.type !== "notevault-backup-v1") {
        throw new Error("Invalid backup file format");
      }

      // Logic to merge tabs
      const currentTabs = storageService.getTabs();
      const mergedTabs = [...currentTabs, ...backup.tabs];
      storageService.setTabs(mergedTabs);

      return { ok: true, count: backup.tabs.length };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle(
    "crypto:changePassphrase",
    async (_, { newPassphrase }: { newPassphrase: string }) => {
      if (!cryptoService.isUnlocked())
        return { ok: false, error: "Vault is locked" };

      try {
        const tabs = storageService.getTabs();
        await cryptoService.rotateKey(newPassphrase, tabs, storageService);

        const newMeta = {
          mode: "passphrase" as const,
          salt: cryptoService.getSalt(),
          pbkdf2Iterations: 310000,
        };
        storageService.setCryptoMeta(newMeta);

        return { ok: true };
      } catch (error: any) {
        return { ok: false, error: error.message };
      }
    },
  );

  ipcMain.handle(
    "crypto:hash",
    (_, { text, algorithm }: { text: string; algorithm: string }) => {
      const crypto = require("node:crypto");
      return crypto.createHash(algorithm).update(text).digest("hex");
    },
  );

  ipcMain.handle(
    "utility:random",
    (_, { min, max }: { min: number; max: number }) => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
  );
}
