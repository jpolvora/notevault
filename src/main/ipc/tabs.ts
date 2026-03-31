import { ipcMain, BrowserWindow, dialog } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { storageService } from '../services/StorageService';
import { Tab, TabGroup } from '../../shared/types';

export function setupTabIpc() {
  // Load all tabs
  ipcMain.handle('tabs:load', () => {
    return storageService.getTabs();
  });

  // Create or update multiple tabs (useful for reordering/syncing)
  ipcMain.on('tabs:save', (_, tabs: Tab[]) => {
    storageService.setTabs(tabs);
  });

  // Partial update for a single tab (debounced content changes)
  ipcMain.on('tab:update', (_, tabId: string, updates: Partial<Tab>) => {
    storageService.updateTab(tabId, updates);
  });

  // Remove settings handlers as they are now in settings.ts

  ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  // Tab Groups
  ipcMain.handle('tabGroups:load', () => {
    return storageService.getGroups();
  });

  ipcMain.on('tabGroups:save', (_, groups: TabGroup[]) => {
    storageService.setGroups(groups);
  });

  // File Import/Export
  ipcMain.handle('tab:importFile', async (_, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const label = path.basename(filePath, path.extname(filePath));
      const ext = path.extname(filePath).toLowerCase().replace('.', '');
      
      // Map extension to Monaco language
      const extMap: Record<string, string> = {
        'txt': 'plaintext',
        'md': 'markdown',
        'json': 'json',
        'js': 'javascript',
        'ts': 'typescript',
        'py': 'python',
        'sql': 'sql',
        'yaml': 'yaml',
        'yml': 'yaml',
        'xml': 'xml',
        'html': 'html',
        'css': 'css'
      };
      
      return {
        content,
        label,
        language: extMap[ext] || 'plaintext',
      };
    } catch (e) {
      console.error('Failed to import file:', e);
      return null;
    }
  });

  ipcMain.handle('tab:exportFile', async (event, content: string, label: string, format: 'txt' | 'md' | 'json') => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;

    const { filePath } = await dialog.showSaveDialog(win, {
      title: 'Export Tab',
      defaultPath: `${label}.${format}`,
      filters: [
        { name: format.toUpperCase(), extensions: [format] }
      ]
    });

    if (filePath) {
      try {
        await fs.writeFile(filePath, content, 'utf8');
        return true;
      } catch (e) {
        console.error('Failed to export file:', e);
        return false;
      }
    }
    return false;
  });
}
