import { app, Menu, Tray, nativeImage, BrowserWindow } from 'electron';
import { join } from 'path';
import { storageService } from './StorageService';

export class TrayService {
  private tray: Tray | null = null;
  private win: BrowserWindow;

  constructor(win: BrowserWindow) {
    this.win = win;
    this.createTray();
  }

  private createTray() {
    // Note: icon.png needs to exist in resources/. For Phase 1 we'll use a standard icon.
    // If resource is not found, we fallback to a native template image if possible.
    const iconPath = join(__dirname, '../../resources/icon.png');
    const trayIcon = nativeImage.createFromPath(iconPath);
    
    this.tray = new Tray(trayIcon);
    
    this.updateMenu();
  }

  public updateMenu() {
    const tabs = storageService.getTabs().filter(t => t.pinned);
    const settings = storageService.getSettings();

    const menu = Menu.buildFromTemplate([
      { label: 'NoteVault', enabled: false },
      { type: 'separator' },
      { label: 'Open', click: () => { this.win.show(); this.win.focus(); } },
      { label: 'New Tab', click: () => this.win.webContents.send('tab:create') },
      { type: 'separator' },
      ...(tabs.length > 0 ? tabs.map(tab => ({
        label: `📌 ${tab.label}`,
        click: () => {
          this.win.show();
          this.win.webContents.send('tab:focus', tab.id);
        }
      })) : [{ label: 'No pinned tabs', enabled: false }]),
      { type: 'separator' },
      { 
        label: settings.closeToTray ? 'Close to Tray: Enabled' : 'Close to Tray: Disabled',
        click: () => {
          const newSettings = { ...settings, closeToTray: !settings.closeToTray };
          storageService.setSettings(newSettings);
          this.win.webContents.send('settings:sync', newSettings);
          this.updateMenu();
        }
      },
      { label: 'Quit', click: () => {
        // Disabling closeToTray on exit so it actually quits
        storageService.updateTab('dummy', {}); // Trigger any last saves
        app.quit();
      }},
    ]);

    this.tray?.setToolTip('NoteVault');
    this.tray?.setContextMenu(menu);
    
    this.tray?.on('click', () => {
      if (this.win.isVisible()) {
        this.win.hide();
      } else {
        this.win.show();
        this.win.focus();
      }
    });
  }

  public destroy() {
    this.tray?.destroy();
  }
}
