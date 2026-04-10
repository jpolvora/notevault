export interface Tab {
  id: string; // UUID v4
  label: string; // User-set name or auto "Tab N"
  content: string; // Raw plaintext (or ciphertext if encrypted)
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
  pinned: boolean; // Survives session clear
  order: number; // Display order
  encrypted: boolean; // Per-tab encryption flag
  syncId?: string; // Google Drive file ID
  deletedAt?: number; // Soft-delete trash period
  archived?: boolean; // Archived state
  language: string; // Monaco language ID, default: 'plaintext'
  viewState?: MonacoViewState; // In-memory only, not persisted
  color?: TabColor; // Optional color label
  groupId?: string; // Optional group UUID
  lastSyncedContent?: string; // In-memory only; cleared on app restart (Phase 5)
  lastSyncedAt?: number; // Unix ms (Phase 5)
}

export type TabColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "gray";

export interface TabGroup {
  id: string;
  label: string;
  color: TabColor;
  collapsed: boolean;
}

export interface MonacoViewState {
  scrollTop: number;
  scrollLeft: number;
  cursorState: unknown;
}

export interface VaultStore {
  version: number;
  tabs: Tab[];
  settings: UserSettings;
  auth?: AuthState;
  cryptoMeta?: CryptoMeta;
  syncQueue?: SyncOperation[];
  syncMeta?: SyncMeta;
  groups?: TabGroup[];
}

export interface SyncOperation {
  type: "push" | "delete";
  tabId: string;
  enqueuedAt: number;
}

export interface SyncMeta {
  lastSyncAt: number; // Unix ms
  manifestEtag?: string; // Drive ETag for optimistic concurrency
}

export interface CryptoMeta {
  mode: "passphrase" | "account";
  salt: string; // base64
  pbkdf2Iterations: number;
}

export interface AuthState {
  provider: "google";
  accessToken: string; // Encrypted at rest
  refreshToken: string; // Encrypted at rest
  expiresAt: number;
  email: string;
  userId: string;
}

export interface UserSettings {
  // Editor
  font: { family: string; fallback: string };
  fontSize: number; // Default: 14
  wordWrap: boolean; // Default: false
  lineNumbers: "on" | "off" | "relative"; // Default: 'off'
  minimap: boolean; // Default: false
  renderWhitespace: "none" | "boundary" | "all";
  smoothScrolling: boolean;
  cursorBlinking: "blink" | "smooth" | "phase" | "solid";
  tabSize: 2 | 4;
  defaultLanguage: string; // Default: 'plaintext'
  fontLigatures: boolean;
  // Appearance
  theme: "system" | "light" | "dark";
  compactTabBar: boolean;
  // Behaviour
  autoSaveInterval: number; // ms, default: 300
  startMinimized: boolean;
  closeToTray: boolean;
  autoStart: boolean;
  globalShortcut: string; // Default: 'Ctrl+Shift+N'
  // Sync & crypto
  syncEnabled: boolean;
  syncInterval: number; // ms, default: 30000
  encryptByDefault: boolean;
  groupTabsByColor: boolean; // Default: false
  editorFontFamily: string;
  editorFontSize: number;
  tabClosingBehavior: "archive" | "discard"; // Default: 'archive'
  // Google Drive Config
  googleClientId?: string;
  googleClientSecret?: string;
  googleConfigValidated?: boolean;
}
