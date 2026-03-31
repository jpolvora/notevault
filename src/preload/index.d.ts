import { ElectronAPI } from '@electron-toolkit/preload'
import { Tab, UserSettings, TabGroup } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      loadTabs: () => Promise<Tab[]>
      saveTabs: (tabs: Tab[]) => void
      updateTab: (id: string, updates: Partial<Tab>) => void
      loadTabGroups: () => Promise<TabGroup[]>
      saveTabGroups: (groups: TabGroup[]) => void
      importFile: (path: string) => Promise<{ content: string; label: string; language: string } | null>
      exportFile: (content: string, label: string, format: string) => Promise<boolean>
      getHash: (text: string, algorithm: string) => Promise<string>
      getRandom: (min: number, max: number) => Promise<number>
      
      loadSettings: () => Promise<UserSettings>
      updateSettings: (settings: UserSettings) => void
      
      close: () => void
      minimize: () => void
      maximize: () => void
      
      onTabCreate: (callback: (tabId: string) => void) => () => void
      onTabFocus: (callback: (tabId: string) => void) => () => void
      onSettingsSync: (callback: (settings: UserSettings) => void) => () => void
      onThemeChanged: (callback: (theme: 'light' | 'dark') => void) => () => void
      
      // Crypto
      unlockVault: (passphrase: string) => Promise<{ ok: boolean; error?: string }>
      isUnlocked: () => Promise<boolean>
      setTabEncrypted: (tabId: string, encrypted: boolean) => Promise<{ ok: boolean; error?: string }>
      getNeedsUnlock: () => Promise<boolean>
      lockVault: () => Promise<void>
      exportVault: () => Promise<{ ok?: boolean, cancelled?: boolean, error?: string }>
      importVault: () => Promise<{ ok?: boolean, count?: number, cancelled?: boolean, error?: string }>
      
      // Auth
      login: () => Promise<{ ok: boolean, error?: string }>
      logout: () => Promise<void>
      getAuthStatus: () => Promise<{ email: string, userId: string } | null>

      // Sync
      syncNow: () => Promise<{ ok: boolean, error?: string }>
      getSyncStatus: () => Promise<{ status: 'idle' | 'syncing' | 'error', lastSync?: number }>
    }
  }
}
