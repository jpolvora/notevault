# Phase 1 — Shell, Tabs & Editor

**NoteVault · [← Master Spec](./spec.md)**  
**Estimate:** 2 weeks · **Delivers:** A fully usable notepad. No encryption, no sync — just tabs that never disappear.

---

## Goals

By the end of Phase 1, a developer can open NoteVault, create tabs, type text, close the app, reopen it, and find every tab exactly as they left it — including scroll position and cursor on the active tab. The editor must feel as fast and native as Notepad.

---

## Deliverables

- Electron app window with Windows 11 Mica background and custom title bar
- Multi-tab system: create, close, rename, reorder, pin
- Monaco editor (one instance per tab, hidden not unmounted)
- Auto-save on every keystroke (debounced 300ms → IPC → electron-store)
- Full session restore on relaunch (all tabs, pinned tabs protected from accidental close)
- Status bar showing Monaco cursor position
- System tray (minimize to tray, quick-access pinned tabs)
- Global keyboard shortcut to show/hide window
- Basic settings stored in electron-store (font, font size, word wrap)

---

## Project Scaffold

```bash
npm create @quick-start/electron notevault -- --template react-ts
cd notevault
npm install monaco-editor @monaco-editor/react
npm install zustand electron-store uuid
npm install -D vite-plugin-monaco-editor @types/uuid
```

**`vite.config.ts`** — configure Monaco worker bundling:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import monacoEditorPlugin from "vite-plugin-monaco-editor";

export default defineConfig({
  plugins: [
    react(),
    monacoEditorPlugin({
      languageWorkers: ["editorWorkerService"],
      // Language workers added lazily in Phase 4
    }),
  ],
});
```

---

## File Structure (Phase 1 scope)

```
src/
├── main/
│   ├── index.ts                 # BrowserWindow, Mica, frameless, tray
│   ├── preload.ts               # contextBridge: exposes tab IPC to renderer
│   ├── ipc/
│   │   └── tabs.ts              # Handles tab:create/update/delete/reorder/pin/rename
│   └── services/
│       ├── StorageService.ts    # electron-store read/write
│       └── TrayService.ts       # System tray icon and menu
│
├── renderer/
│   ├── index.tsx                # Monaco worker bootstrap + React root
│   ├── App.tsx                  # Layout: TabBar + EditorPane + StatusBar
│   ├── components/
│   │   ├── TitleBar/
│   │   │   ├── TitleBar.tsx     # Custom frameless title bar + window controls
│   │   │   └── TitleBar.module.css
│   │   ├── TabBar/
│   │   │   ├── TabBar.tsx       # Tab list, + button, overflow scroll
│   │   │   ├── TabItem.tsx      # Individual tab with pin/lock icons, rename, context menu
│   │   │   └── TabBar.module.css
│   │   ├── Editor/
│   │   │   ├── EditorPane.tsx   # Maps tabs → MonacoInstance, show/hide strategy
│   │   │   ├── MonacoInstance.tsx  # @monaco-editor/react wrapper + all options
│   │   │   ├── monacoThemes.ts  # notevault-light / notevault-dark theme definitions
│   │   │   └── monacoWorkers.ts # Worker bootstrap (editor.worker only in Phase 1)
│   │   └── StatusBar/
│   │       ├── StatusBar.tsx    # Ln/Col, encoding, sync placeholder
│   │       └── StatusBar.module.css
│   ├── store/
│   │   ├── tabs.ts              # Zustand: tabs array, activeTabId, viewStates (in-memory)
│   │   └── ui.ts                # Zustand: theme, settings
│   └── styles/
│       ├── tokens.css           # Windows 11 CSS custom properties
│       └── global.css
│
└── shared/
    └── types.ts                 # Tab, MonacoViewState, UserSettings (Phase 1 subset)
```

---

## Electron Window Setup

```typescript
// src/main/index.ts
const win = new BrowserWindow({
  width: 900,
  height: 680,
  minWidth: 480,
  minHeight: 320,
  frame: false, // Custom title bar
  transparent: false,
  backgroundColor: "#00000000",
  webPreferences: {
    preload: path.join(__dirname, "preload.js"),
    contextIsolation: true,
    nodeIntegration: false,
  },
});

// Windows 11 Mica material
if (process.platform === "win32") {
  win.setBackgroundMaterial("mica");
}
```

---

## Monaco Configuration

```typescript
// src/renderer/components/Editor/MonacoInstance.tsx
const DEFAULT_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  language: "plaintext",
  fontFamily: "Cascadia Mono, Consolas, monospace",
  fontSize: 14,
  lineHeight: 22,
  fontLigatures: true,
  wordWrap: "off",
  lineNumbers: "off",
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  renderWhitespace: "none",
  smoothScrolling: true,
  cursorBlinking: "smooth",
  cursorSmoothCaretAnimation: "on",
  padding: { top: 16, bottom: 16 },
  overviewRulerLanes: 0,
  renderLineHighlight: "none",
  scrollbar: {
    verticalScrollbarSize: 8,
    horizontalScrollbarSize: 8,
    useShadows: false,
  },
  contextmenu: true,
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  acceptSuggestionOnEnter: "off",
  tabCompletion: "off",
  parameterHints: { enabled: false },
  folding: false,
  links: true,
  automaticLayout: true,
};
```

### Theme Definition

```typescript
// src/renderer/components/Editor/monacoThemes.ts
monaco.editor.defineTheme("notevault-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#00000000", // Transparent — Mica shows through
    "editor.foreground": "#E8E8E8",
    "editor.selectionBackground": "#0078D440",
    "editor.lineHighlightBackground": "#FFFFFF08",
    "editorCursor.foreground": "#0078D4", // Windows accent color
    "editorLineNumber.foreground": "#555555",
  },
});

monaco.editor.defineTheme("notevault-light", {
  base: "vs",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#00000000",
    "editor.foreground": "#1A1A1A",
    "editor.selectionBackground": "#0078D430",
    "editor.lineHighlightBackground": "#00000008",
    "editorCursor.foreground": "#0078D4",
  },
});
```

---

## Tab Switching — View State Preservation

Each tab's Monaco editor is **hidden (`display: none`) but never unmounted**. This preserves the full undo stack and selection history for as long as the app is open.

```typescript
// EditorPane.tsx — render all tabs, show only the active one
{tabs.map(tab => (
  <div
    key={tab.id}
    style={{ display: tab.id === activeTabId ? 'flex' : 'none', height: '100%' }}
  >
    <MonacoInstance tab={tab} isActive={tab.id === activeTabId} />
  </div>
))}
```

Before hiding, save view state to Zustand (in-memory, not persisted):

```typescript
// On tab switch away
const viewState = editorRef.current?.saveViewState();
if (viewState) tabStore.setViewState(prevTabId, viewState);

// On tab switch to
const savedState = tabStore.getViewState(nextTabId);
if (savedState) editorRef.current?.restoreViewState(savedState);
editorRef.current?.focus();
```

---

## Auto-Save Flow

```
User types keystroke
  → Monaco onChange fires
  → Renderer debounces 300ms
  → IPC: tab:update { id, content, updatedAt }
  → Main: StorageService.updateTab(id, { content, updatedAt })
  → electron-store write (synchronous, ~3ms)
```

No "Save" button. No unsaved indicator. The title bar is always clean.

---

## Session Restore Flow

```
App launches
  → Main: StorageService.loadAll() → Tab[]
  → Main: IPC tabs:load → renderer
  → Renderer: Zustand tabs store populated
  → EditorPane: mounts all Monaco instances with saved content
  → Active tab: first pinned tab, or first tab, or new blank tab
```

**Pinned tabs** cannot be closed with `Ctrl+W` or middle-click. The close button (`×`) is hidden on pinned tabs — replaced by the pin icon. User must right-click → Unpin first.

---

## Tab Context Menu

Right-click on any tab opens a menu:

| Item             | Notes                                   |
| ---------------- | --------------------------------------- |
| Rename           | Inline edit on the tab label            |
| Pin / Unpin      | Toggle `pinned` flag                    |
| Duplicate        | Creates a new tab with the same content |
| Move to first    | Sets `order: 0`, shifts others          |
| Close            | Disabled if pinned                      |
| Close all others | Skips pinned tabs                       |

---

## System Tray

```typescript
// TrayService.ts
const tray = new Tray(path.join(assetsPath, "icon-tray.ico"));
tray.setContextMenu(
  Menu.buildFromTemplate([
    { label: "Open NoteVault", click: () => win.show() },
    {
      label: "New Tab",
      click: () => win.webContents.send("tab:createFromTray"),
    },
    { type: "separator" },
    // Pinned tabs injected dynamically
    ...pinnedTabs.map((t) => ({
      label: t.label,
      click: () => {
        win.show();
        win.webContents.send("tab:focus", t.id);
      },
    })),
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]),
);
```

When the window is closed and `closeToTray` is `true` (default), the app hides instead of quitting:

```typescript
win.on("close", (e) => {
  if (settings.closeToTray) {
    e.preventDefault();
    win.hide();
  }
});
```

---

## Keyboard Shortcuts (Phase 1)

| Shortcut            | Action                              | Handler                 |
| ------------------- | ----------------------------------- | ----------------------- |
| `Ctrl+T`            | New tab                             | App                     |
| `Ctrl+W`            | Close current tab (no-op if pinned) | App                     |
| `Ctrl+Tab`          | Next tab                            | App                     |
| `Ctrl+Shift+Tab`    | Previous tab                        | App                     |
| `Ctrl+1…9`          | Jump to tab N                       | App                     |
| `Ctrl+H`            | Find & Replace                      | **Monaco native**       |
| `Ctrl+G`            | Go to line                          | **Monaco native**       |
| `Alt+↑/↓`           | Move line up/down                   | **Monaco native**       |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo                         | **Monaco native**       |
| `Ctrl+Shift+N`      | Global: show/focus window           | Electron globalShortcut |
| `Alt+F4`            | Close to tray                       | App                     |

**`Ctrl+P` conflict:** Monaco binds this to "Go to file". Override it on mount:

```typescript
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
  /* open command palette — wired in Phase 4 */
});
```

---

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│ ⬡ NoteVault                     [─]  [□]  [✕]      │  ← Custom title bar, Mica bg
├─────────────────────────────────────────────────────┤
│📌 Tab 1  ×  │  Prompts  ×  │  Notes  ×  │  +        │  ← Tab bar
├─────────────────────────────────────────────────────┤
│                                                      │
│   Cascadia Mono · plaintext                          │
│   _                                                  │  ← Monaco (fills window)
│                                                      │
│                                                      │
├─────────────────────────────────────────────────────┤
│  Ln 1, Col 1   UTF-8   plaintext                    │  ← Status bar
└─────────────────────────────────────────────────────┘
```

---

## Windows 11 Design Tokens (`tokens.css`)

```css
:root {
  --color-bg: transparent; /* Mica shows through */
  --color-surface: rgba(255, 255, 255, 0.06);
  --color-border: rgba(255, 255, 255, 0.1);
  --color-text-primary: #e8e8e8;
  --color-text-muted: #888888;
  --color-accent: env(--system-accent, #0078d4); /* Windows accent color */
  --tab-height: 36px;
  --statusbar-height: 24px;
  --titlebar-height: 32px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --font-ui: "Segoe UI Variable", "Segoe UI", sans-serif;
}
```

---

## Acceptance Criteria

- [ ] App launches in < 1.5 seconds cold start on a mid-range Windows 11 machine
- [ ] Creating 20 tabs shows no perceptible lag in tab bar
- [ ] Typing 10,000 characters in a tab: no visible jank or dropped keystrokes
- [ ] Close app → reopen: all tabs present with correct content
- [ ] Pinned tab: `Ctrl+W` does nothing; close button hidden
- [ ] Middle-click closes non-pinned tab, no-ops on pinned
- [ ] Tab rename: double-click label, type, Enter to confirm, Escape to cancel
- [ ] Drag-reorder tabs persists after app restart
- [ ] Tray: app hides on window close; click tray icon to show
- [ ] Tray: pinned tabs listed; clicking one focuses that tab
- [ ] `Ctrl+Shift+N` (global) shows the window from any app
- [ ] Monaco Find/Replace (`Ctrl+H`) opens inline, not a system dialog
- [ ] Status bar updates line/col as cursor moves

---

## Phase 1 → Phase 2 Handoff

At the end of Phase 1, the data model has no encryption fields populated. `Tab.encrypted` defaults to `false`, `Tab.content` is always plaintext. Phase 2 plugs into `StorageService` and `tab:update` without modifying the Phase 1 IPC contracts.
