import { ipcMain, BrowserWindow, dialog } from "electron";
import * as fs from "fs/promises";
import * as path from "path";
import AdmZip from "adm-zip";
import { v4 as uuidv4 } from "uuid";
import { storageService } from "../services/StorageService";
import { Tab, TabGroup } from "../../shared/types";

export function setupTabIpc() {
  // Load all tabs
  ipcMain.handle("tabs:load", () => {
    return storageService.getTabs();
  });

  // Create or update multiple tabs (useful for reordering/syncing)
  ipcMain.on("tabs:save", (_, tabs: Tab[]) => {
    storageService.setTabs(tabs);
  });

  // Partial update for a single tab (debounced content changes)
  ipcMain.on("tab:update", (_, tabId: string, updates: Partial<Tab>) => {
    storageService.updateTab(tabId, updates);
  });

  // Bulk operations
  ipcMain.handle("tabs:exportAllZip", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;

    const { filePath } = await dialog.showSaveDialog(win, {
      title: "Export All Tabs as ZIP",
      defaultPath: `NoteVault_Backup_${new Date().toISOString().split("T")[0]}.zip`,
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    });

    if (!filePath) return false;

    try {
      const tabs = storageService.getTabs(); // Already decrypted
      const zip = new AdmZip();

      tabs.forEach((tab) => {
        const sanitizedLabel = tab.label.replace(/[\\/:*?"<>|]/g, "_");
        const filename = `${sanitizedLabel}.txt`; // Always use txt for simplicity? or match language?
        zip.addFile(filename, Buffer.from(tab.content, "utf8"));
      });

      // Special file for metadata/encrypted states if needed
      const metadata = tabs.map((t) => ({
        id: t.id,
        label: t.label,
        language: t.language,
        encrypted: t.encrypted,
        archived: t.archived,
        pinned: t.pinned,
        color: t.color,
        groupId: t.groupId,
      }));
      zip.addFile(
        ".notevault-meta.json",
        Buffer.from(JSON.stringify(metadata, null, 2)),
      );

      zip.writeZip(filePath);
      return true;
    } catch (e) {
      console.error("Failed to export ZIP:", e);
      return false;
    }
  });

  ipcMain.handle("tabs:clearAll", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;

    const { response } = await dialog.showMessageBox(win, {
      type: "warning",
      buttons: ["Cancel", "Clear All"],
      defaultId: 0,
      title: "Clear All Data",
      message:
        "Are you sure you want to clear all tabs? This cannot be undone.",
      detail: "Encryption settings and vault password will be preserved.",
    });

    if (response === 1) {
      storageService.clearAllData();
      return true;
    }
    return false;
  });

  ipcMain.handle("tabs:importAll", async (event, merge: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;

    const { filePaths } = await dialog.showOpenDialog(win, {
      title: "Import NoteVault Backup",
      filters: [{ name: "NoteVault Backup", extensions: ["zip", "json"] }],
      properties: ["openFile"],
    });

    if (!filePaths || filePaths.length === 0) return false;

    const filePath = filePaths[0];
    try {
      // If it's a zip, we try to find .notevault-meta.json or just import .txt files
      if (filePath.endsWith(".zip")) {
        const zip = new AdmZip(filePath);
        const zipEntries = zip.getEntries();
        const metaEntry = zipEntries.find(
          (e) => e.entryName === ".notevault-meta.json",
        );

        const newTabs: Tab[] = [];

        if (metaEntry) {
          const meta = JSON.parse(metaEntry.getData().toString("utf8"));
          for (const item of meta) {
            const entry = zipEntries.find(
              (e) =>
                e.entryName ===
                `${item.label.replace(/[\\/:*?"<>|]/g, "_")}.txt`,
            );
            if (entry) {
              newTabs.push({
                ...item,
                content: entry.getData().toString("utf8"),
                updatedAt: Date.now(),
              });
            }
          }
        } else {
          // Fallback: import all .txt, .md files as new tabs
          zipEntries.forEach((entry, index) => {
            if (
              entry.entryName.endsWith(".txt") ||
              entry.entryName.endsWith(".md")
            ) {
              newTabs.push({
                id: uuidv4(),
                label: path.basename(
                  entry.entryName,
                  path.extname(entry.entryName),
                ),
                content: entry.getData().toString("utf8"),
                language: entry.entryName.endsWith(".md")
                  ? "markdown"
                  : "plaintext",
                updatedAt: Date.now(),
                createdAt: Date.now(),
                order: index,
                encrypted: false,
                archived: false,
                pinned: false,
              });
            }
          });
        }

        storageService.importTabs(newTabs, merge);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to import backup:", e);
      return false;
    }
  });

  // Remove settings handlers as they are now in settings.ts

  ipcMain.on("window:close", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  ipcMain.on("window:minimize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.on("window:maximize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  // Tab Groups
  ipcMain.handle("tabGroups:load", () => {
    return storageService.getGroups();
  });

  ipcMain.on("tabGroups:save", (_, groups: TabGroup[]) => {
    storageService.setGroups(groups);
  });

  // File Import/Export
  ipcMain.handle("tab:importFile", async (_, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const label = path.basename(filePath, path.extname(filePath));
      const ext = path.extname(filePath).toLowerCase().replace(".", "");

      // Map extension to Monaco language
      const extMap: Record<string, string> = {
        txt: "plaintext",
        md: "markdown",
        json: "json",
        js: "javascript",
        ts: "typescript",
        py: "python",
        sql: "sql",
        yaml: "yaml",
        yml: "yaml",
        xml: "xml",
        html: "html",
        css: "css",
      };

      return {
        content,
        label,
        language: extMap[ext] || "plaintext",
      };
    } catch (e) {
      console.error("Failed to import file:", e);
      return null;
    }
  });

  ipcMain.handle(
    "tab:exportFile",
    async (
      event,
      content: string,
      label: string,
      format: "txt" | "md" | "json",
    ) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) return false;

      const { filePath } = await dialog.showSaveDialog(win, {
        title: "Export Tab",
        defaultPath: `${label}.${format}`,
        filters: [{ name: format.toUpperCase(), extensions: [format] }],
      });

      if (filePath) {
        try {
          await fs.writeFile(filePath, content, "utf8");
          return true;
        } catch (e) {
          console.error("Failed to export file:", e);
          return false;
        }
      }
      return false;
    },
  );
}
