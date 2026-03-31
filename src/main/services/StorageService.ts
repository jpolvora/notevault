import Store from 'electron-store';
import { Tab, UserSettings, CryptoMeta, AuthState, SyncMeta, SyncOperation, TabGroup } from '../../shared/types';
import { cryptoService } from './CryptoService';

interface StoreSchema {
  tabs: Tab[];
  settings: UserSettings;
  cryptoMeta?: CryptoMeta;
  auth?: AuthState;
  syncQueue?: SyncOperation[];
  syncMeta?: SyncMeta;
  groups?: TabGroup[];
}

const DEFAULT_SETTINGS: UserSettings = {
  font: { family: 'Cascadia Mono', fallback: 'Consolas, monospace' },
  fontSize: 14,
  wordWrap: false,
  lineNumbers: 'off',
  minimap: false,
  renderWhitespace: 'none',
  smoothScrolling: true,
  cursorBlinking: 'smooth',
  tabSize: 4,
  defaultLanguage: 'plaintext',
  fontLigatures: true,
  theme: 'system',
  compactTabBar: false,
  autoSaveInterval: 300,
  startMinimized: false,
  closeToTray: true,
  globalShortcut: 'Ctrl+Shift+N',
  syncEnabled: false,
  syncInterval: 30000,
  encryptByDefault: false,
  groupTabsByColor: false,
  editorFontFamily: "'Cascadia Mono', Consolas, 'Courier New', monospace",
  editorFontSize: 14,
};

class StorageService {
  private store: Store<StoreSchema>;

  constructor() {
    this.store = new Store<StoreSchema>({
      defaults: {
        tabs: [],
        settings: DEFAULT_SETTINGS,
        groups: [],
      },
    });
  }

  getTabs(): Tab[] {
    const rawTabs = this.store.get('tabs');
    return rawTabs.map((tab) => this.loadTab(tab));
  }

  private loadTab(tab: Tab): Tab {
    const baseTab = {
      ...tab,
      lastSyncedContent: undefined,
      lastSyncedAt: undefined,
    };

    if (!tab.encrypted) return baseTab;
    
    if (cryptoService.isUnlocked()) {
      try {
        const decrypted = cryptoService.decrypt(tab.content);
        return { 
          ...baseTab, 
          content: decrypted,
        };
      } catch (e) {
        console.error(`Failed to decrypt tab ${tab.id}:`, e);
        return { ...baseTab, content: ' [ DECRYPTION FAILED ] ' };
      }
    }
    
    // Redacted if locked
    return { ...baseTab, content: '' };
  }

  setTabs(tabs: Tab[]) {
    const toStore = tabs.map((tab) => this.prepareTabForStorage(tab));
    this.store.set('tabs', toStore);
  }

  private prepareTabForStorage(tab: Tab): Tab {
    if (!tab.encrypted) return tab;
    
    if (!cryptoService.isUnlocked()) {
      // If we are saving an already encrypted tab while locked, 
      // we must have the ciphertext already. But we should be careful.
      // Usually, if locked, we shouldn't be editing encrypted tabs anyway.
      // But if we're doing a global "setTabs" (like on reorder), we might have only ciphertext.
      // Actually, my getTabs returns redacted content if locked.
      // This is a bit tricky. If locked, we shouldn't overwrite encrypted content with redacted content.
      
      const currentStoredTabs = this.store.get('tabs');
      const storedTab = currentStoredTabs.find(t => t.id === tab.id);
      if (storedTab && storedTab.encrypted) {
          // Preserve the original ciphertext if we are locked
          return storedTab;
      }
      
      throw new Error('Cannot save encrypted tab: vault is locked');
    }

    return { ...tab, content: cryptoService.encrypt(tab.content) };
  }

  getSettings(): UserSettings {
    return this.store.get('settings');
  }

  setSettings(settings: UserSettings) {
    this.store.set('settings', settings);
  }

  getCryptoMeta(): CryptoMeta | undefined {
    return this.store.get('cryptoMeta');
  }

  setCryptoMeta(meta: CryptoMeta) {
    this.store.set('cryptoMeta', meta);
  }

  getAuth(): AuthState | undefined {
    // Auth should be encrypted by StorageService or Store?
    // Spec says stored encrypted via AES-256-GCM in VaultStore.auth.
    // electron-store can do encryption but we want to use our CryptoService.
    const rawAuth = this.store.get('auth');
    if (!rawAuth) return undefined;
    
    // Actually, if it's already encrypted in the store, we need to decrypt it here.
    // But CryptoService is used for tab content.
    // The spec says: "Stored both tokens encrypted via CryptoService in VaultStore.auth"
    // This implies we encrypt them before calling setAuth.
    return rawAuth;
  }

  setAuth(auth: AuthState | undefined) {
    this.store.set('auth', auth);
  }

  getSyncQueue(): SyncOperation[] {
    return this.store.get('syncQueue') || [];
  }

  setSyncQueue(queue: SyncOperation[]) {
    this.store.set('syncQueue', queue);
  }

  getSyncMeta(): SyncMeta | undefined {
    return this.store.get('syncMeta');
  }

  setSyncMeta(meta: SyncMeta) {
    this.store.set('syncMeta', meta);
  }
  
  getGroups(): TabGroup[] {
    return this.store.get('groups') || [];
  }
  
  setGroups(groups: TabGroup[]) {
    this.store.set('groups', groups);
  }

  updateTab(id: string, updates: Partial<Tab>) {
    const tabs = this.getTabs();
    const index = tabs.findIndex((t) => t.id === id);
    if (index !== -1) {
      tabs[index] = { ...tabs[index], ...updates };
      this.setTabs(tabs);
    }
  }

  saveAll(tabs: Tab[], settings: UserSettings) {
    this.setTabs(tabs);
    this.setSettings(settings);
  }
}

export const storageService = new StorageService();
export default StorageService;
