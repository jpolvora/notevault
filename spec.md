# NoteVault — Master Specification
### A Secure, Synced, Multi-Tab Text Editor for Windows 11
**Stack:** Electron + TypeScript + Monaco Editor · Target OS: Windows 11  
**Version:** 1.0.1 · Status: Final (2026-03-31)  

---

## 1. Vision & Purpose

NoteVault is a fast, keyboard-friendly text editor for power users who live and die by their clipboard. It is not a rich-text editor, not a Notion, not a markdown notebook. It is the spiritual successor to Notepad — but with tabs, encryption, cloud sync, and session persistence.

**Core use cases:**
- Quick scratchpad notes and reminders
- Storing LLM prompts and reusable text snippets
- Temporarily parking credentials (passwords, API keys, tokens) with encryption at rest
- Copy-paste buffer: keep 10 tabs of things you are cycling through
- Survive reboots: every tab is exactly where you left it

---

## 2. Technical Stack

| Layer | Choice | Rationale |
|---|---|---|
| Shell | **Electron v30+** | Native Windows integration, tray icon, global shortcuts |
| Language | **TypeScript (strict mode)** | Type safety, large ecosystem, native to Electron |
| UI Framework | **React 18** | Component model fits tab architecture |
| Editor Engine | **Monaco Editor** (`monaco-editor` npm) | VS Code's editor core, standalone — no VS Code overhead |
| Monaco binding | **`@monaco-editor/react`** | Declarative wrapper, handles worker setup automatically |
| Styling | **CSS Modules + CSS Variables** | No runtime overhead, Windows 11 design tokens |
| State | **Zustand** | Lightweight, works great with Electron IPC |
| Persistence | **electron-store** (AES-256 encrypted JSON) | Built-in encryption, no DB overhead |
| Sync | **Google Drive API v3** | OAuth 2.0 PKCE flow, appdata scope, free tier sufficient |
| Crypto | **Node.js `crypto`** (AES-256-GCM) | Built-in, audited, no external deps |
| Auto-update | **electron-updater** | Seamless background updates |
| Build | **electron-builder** | NSIS installer, code signing ready |

---

## 3. Shared Data Model

These interfaces are defined in `src/shared/types.ts` and used across all phases.

```typescript
interface Tab {
  id: string;              // UUID v4
  label: string;           // User-set name or auto "Tab N"
  content: string;         // Raw plaintext (or ciphertext if encrypted)
  createdAt: number;       // Unix timestamp
  updatedAt: number;       // Unix timestamp
  pinned: boolean;         // Survives session clear
  order: number;           // Display order
  encrypted: boolean;      // Per-tab encryption flag
  syncId?: string;         // Google Drive file ID
  deletedAt?: number;      // Soft-delete timestamp (7-day trash)
  archived: boolean;       // Archived state
  language: string;        // Monaco language ID, default: 'plaintext'
  viewState?: MonacoViewState; // In-memory only, not persisted
  color?: string;          // Optional color label
  groupId?: string;        // Optional group ID
  lastSyncedContent?: string; // Phase 5 diff tracking
  lastSyncedAt?: number;
}

interface MonacoViewState {
  scrollTop: number;
  scrollLeft: number;
  cursorState: unknown;
}

interface VaultStore {
  version: number;
  tabs: Tab[];
  settings: UserSettings;
  auth?: AuthState;
}

interface AuthState {
  provider: 'google';
  accessToken: string;     // Encrypted at rest
  refreshToken: string;    // Encrypted at rest
  expiresAt: number;
  email: string;
  userId: string;
}

interface UserSettings {
  // Editor
  font: { family: string; fallback: string };
  fontSize: number;        // Default: 14
  wordWrap: boolean;       // Default: false
  lineNumbers: 'on' | 'off' | 'relative'; // Default: 'off'
  minimap: boolean;        // Default: false
  renderWhitespace: 'none' | 'boundary' | 'all';
  smoothScrolling: boolean;
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'solid';
  tabSize: 2 | 4;
  defaultLanguage: string; // Default: 'plaintext'
  fontLigatures: boolean;
  // Appearance
  theme: 'system' | 'light' | 'dark';
  compactTabBar: boolean;
  // Behaviour
  autoSaveInterval: number; // ms, default: 300
  startMinimized: boolean;
  closeToTray: boolean;
  globalShortcut: string;  // Default: 'Ctrl+Shift+N'
  // Sync & crypto (populated in Phase 3)
  syncEnabled: boolean;
  syncInterval: number;    // ms, default: 30000
  encryptByDefault: boolean;
  groupTabsByColor: boolean;
  editorFontFamily: string;
  editorFontSize: number;
}
```

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process (React)                  │
│  TabBar  ─  MonacoEditor  ─  StatusBar  ─  CommandPalette   │
│                ↕ IPC (contextBridge / preload.ts)           │
├─────────────────────────────────────────────────────────────┤
│                    Main Process (Node)                       │
│  WindowManager  ─  TabManager  ─  SyncService               │
│  CryptoService  ─  StorageService  ─  TrayService           │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴────────────┐
        ▼                        ▼
  electron-store              Google Drive
  (AES-256-GCM)               (REST API v3)
```

### IPC Channel Map (all phases)

| Channel | Dir | Phase | Purpose |
|---|---|---|---|
| `tab:create` | R→M | 1 | Create new tab |
| `tab:update` | R→M | 1 | Push content change (debounced) |
| `tab:delete` | R→M | 1 | Remove tab |
| `tab:reorder` | R→M | 1 | Drag-reorder |
| `tab:pin` | R→M | 1 | Toggle pin |
| `tab:rename` | R→M | 1 | Set custom label |
| `tabs:load` | M→R | 1 | Send all tabs on startup |
| `crypto:setEncrypted` | R→M | 2 | Toggle per-tab encryption |
| `crypto:unlock` | M→R | 2 | Vault decrypted and ready |
| `auth:login` | R→M | 3 | Initiate OAuth flow |
| `auth:logout` | R→M | 3 | Clear tokens |
| `sync:status` | M→R | 3 | Push sync state (idle/syncing/error) |
| `sync:now` | R→M | 3 | Force immediate sync |
| `settings:update` | R→M | 4 | Persist settings change |

---

## 5. Delivery Phases

| Phase | Name | Outcome | Status |
|---|---|---|---|
| [**Phase 1**](./phase1.md) | Shell, Tabs & Editor | Usable notepad with Monaco | ✅ Completed |
| [**Phase 2**](./phase2.md) | Encryption | Per-tab AES-256-GCM | ✅ Completed |
| [**Phase 3**](./phase3.md) | Cloud Sync | Google OAuth, Drive sync | ⚡️ Polishing |
| [**Phase 4**](./phase4.md) | Polish & Settings | Command palette, settings panel | ⚡️ Polishing |
| [**Phase 5**](./phase5.md) | Power Features | Tab groups, search, diff view | ✅ Completed |
| [**Phase 6**](./phase6.md) | UX Polish & Utilities | Archiving, font customization, utilities | ✅ Completed |

Each phase document is fully self-contained: it lists its goals, deliverables, file changes, acceptance criteria, and any open questions specific to that phase.

---

## 6. Open Questions (Cross-Phase)

| # | Question | Suggested Default | Phase |
|---|---|---|---|
| 1 | Max tab size limit? | 10MB per tab | 1 |
| 2 | Undo history across sessions? | No — Monaco undo is in-session only | 1 |
| 3 | One Monaco instance per tab, or shared model? | One per tab (hidden, never unmounted) | 1 |
| 4 | Encrypt by default or opt-in? | Opt-in per tab, opt-out via settings | 2 |
| 5 | Offline passphrase fallback? | Yes — HKDF from cached userId | 2 |
| 6 | Key rotation on logout? | Yes — re-encrypt all local content | 2 |
| 7 | Sync per tab or global? | Global with per-tab opt-out | 3 |
| 8 | Conflict resolution strategy? | Last-write-wins (v1), three-way merge (v2) | 3 |
| 9 | Soft-delete trash period? | 7 days before permanent deletion | 3 |
| 10 | Monaco minimap: toggle or always off? | Toggleable, off by default | 4 |
| 11 | Lazy-load language workers? | Yes — load only when language mode is set | 4 |
| 12 | Browser extension ("send to NoteVault")? | Phase 5 / v2.0 scope | 5 |

---

*NoteVault — because your clipboard deserves better.*
