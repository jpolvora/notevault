# Phase 4 — Polish & Settings

**NoteVault · [← Master Spec](./spec.md) · [← Phase 3](./phase3.md)**  
**Estimate:** 1.5 weeks · **Depends on:** Phase 3 complete · **Delivers:** Production-ready app. Command palette, full settings panel, language modes, Windows 11 polish, installer, auto-update.

---

## Goals

Phase 4 takes a working but rough application and turns it into something shippable. Every user-facing control is exposed in the Settings panel. The command palette makes the app keyboard-navigable without memorising shortcuts. The build pipeline produces a signed, self-updating Windows installer.

---

## Deliverables

- Full Settings panel (all sections: Editor, Appearance, Auto-Save, Encryption, Sync, Startup, Shortcuts)
- Command palette (`Ctrl+P`) with fuzzy search over commands and tabs
- Per-tab language mode selector (syntax highlighting via Monaco, lazy worker loading)
- Windows 11 Fluent polish: Mica, system accent color, animations, compact/comfortable tab bar density
- `electron-builder` NSIS installer
- `electron-updater` auto-update (GitHub Releases)
- `vite-plugin-monaco-editor` tree-shaking (target: ~1.5MB Monaco bundle)
- Code signing setup guide (EV certificate)

---

## New Files (Phase 4)

```
src/
├── main/
│   ├── ipc/
│   │   └── settings.ts          # settings:update handler, persists to StorageService
│   └── services/
│       └── UpdateService.ts     # electron-updater: check, download, install
│
└── renderer/
    └── components/
        ├── CommandPalette/
        │   ├── CommandPalette.tsx      # Fuzzy search over commands + tabs
        │   ├── commandRegistry.ts      # All registered commands with labels/shortcuts
        │   └── CommandPalette.module.css
        ├── Settings/
        │   ├── Settings.tsx            # Full-window settings overlay
        │   ├── sections/
        │   │   ├── EditorSettings.tsx
        │   │   ├── AppearanceSettings.tsx
        │   │   ├── AutoSaveSettings.tsx
        │   │   ├── EncryptionSettings.tsx
        │   │   ├── SyncSettings.tsx
        │   │   ├── StartupSettings.tsx
        │   │   └── ShortcutsSettings.tsx
        │   └── Settings.module.css
        └── LanguageSelector/
            ├── LanguageSelector.tsx    # Status bar click → language picker popover
            └── LanguageSelector.module.css
```

---

## Command Palette

Triggered by `Ctrl+P`. A centered overlay (Acrylic background) with a single search input and live-filtered list.

### Search Scope

1. **Commands** — registered actions with labels and keyboard hints
2. **Open tabs** — fuzzy match on tab label (prefix `tab:` in search to filter to tabs only)
3. **Content search** — prefix `>` to search content across all tabs (Phase 5 full implementation; Phase 4 delivers basic substring match)

### Layout

```
┌─────────────────────────────────────────────────────┐
│                                                      │
│   ┌──────────────────────────────────────────────┐  │
│   │ 🔍  Type a command or tab name...            │  │
│   └──────────────────────────────────────────────┘  │
│                                                      │
│   COMMANDS                                           │
│   ▶ New Tab                              Ctrl+T     │
│   ▶ Close Tab                            Ctrl+W     │
│   ▶ Pin / Unpin Tab                      Ctrl+⇧P   │
│   ▶ Toggle Encryption                    Ctrl+⇧E   │
│   ▶ Sync Now                             Ctrl+⇧S   │
│   ▶ Settings                             Ctrl+,    │
│   ▶ Toggle Word Wrap                              │
│   ▶ Toggle Line Numbers                           │
│                                                      │
│   TABS                                               │
│   📄 Prompts                                        │
│   🔒 Credentials                                    │
│   📌 Work Notes                                     │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Command Registry

```typescript
// commandRegistry.ts
interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon?: string;
  action: () => void;
}

const commands: Command[] = [
  { id: 'tab.new',       label: 'New Tab',               shortcut: 'Ctrl+T',       action: () => tabStore.create() },
  { id: 'tab.close',     label: 'Close Tab',             shortcut: 'Ctrl+W',       action: () => tabStore.closeActive() },
  { id: 'tab.pin',       label: 'Pin / Unpin Tab',       shortcut: 'Ctrl+Shift+P', action: () => tabStore.togglePin() },
  { id: 'tab.encrypt',   label: 'Toggle Encryption',     shortcut: 'Ctrl+Shift+E', action: () => ipc.invoke('crypto:setEncrypted', ...) },
  { id: 'sync.now',      label: 'Sync Now',              shortcut: 'Ctrl+Shift+S', action: () => ipc.invoke('sync:now') },
  { id: 'app.settings',  label: 'Settings',              shortcut: 'Ctrl+,',       action: () => uiStore.openSettings() },
  { id: 'editor.wrap',   label: 'Toggle Word Wrap',                                action: () => settingsStore.toggle('wordWrap') },
  { id: 'editor.nums',   label: 'Toggle Line Numbers',                             action: () => settingsStore.toggle('lineNumbers') },
  { id: 'editor.lang',   label: 'Set Language Mode…',                             action: () => uiStore.openLanguageSelector() },
  // ... more
];
```

---

## Per-Tab Language Mode

Language mode is stored in `tab.language` (set to `'plaintext'` by default in Phase 1).

### Language Picker (Status Bar Click)

Clicking the language name in the status bar opens a small popover listing supported languages. Selecting one calls:

```typescript
// Renderer
monaco.editor.setModelLanguage(editor.getModel()!, newLang);
tabStore.update(tab.id, { language: newLang });
ipc.invoke("tab:update", { id: tab.id, language: newLang });
```

### Supported Languages (v1)

`plaintext`, `markdown`, `json`, `javascript`, `typescript`, `python`, `sql`, `shell`, `xml`, `yaml`, `html`, `css`

### Lazy Worker Loading

Language workers are loaded on demand to avoid bundling all ~4MB of language services upfront:

```typescript
// monacoWorkers.ts — updated for Phase 4
self.MonacoEnvironment = {
  getWorker(_, label) {
    switch (label) {
      case "json":
        return new Worker(
          new URL(
            "monaco-editor/esm/vs/language/json/json.worker",
            import.meta.url,
          ),
        );
      case "typescript":
      case "javascript":
        return new Worker(
          new URL(
            "monaco-editor/esm/vs/language/typescript/ts.worker",
            import.meta.url,
          ),
        );
      case "css":
      case "scss":
      case "less":
        return new Worker(
          new URL(
            "monaco-editor/esm/vs/language/css/css.worker",
            import.meta.url,
          ),
        );
      case "html":
      case "xml":
        return new Worker(
          new URL(
            "monaco-editor/esm/vs/language/html/html.worker",
            import.meta.url,
          ),
        );
      default:
        return new Worker(
          new URL("monaco-editor/esm/vs/editor/editor.worker", import.meta.url),
        );
    }
  },
};
```

`vite-plugin-monaco-editor` handles code-splitting these workers into separate chunks automatically.

---

## Settings Panel

Full-window overlay triggered by `Ctrl+,`. Sidebar navigation on the left, content on the right.

```
┌─────────────────────────────────────────────────────┐
│ ⬡ NoteVault Settings            [─]  [□]  [✕]      │
├───────────┬─────────────────────────────────────────┤
│ Editor    │  EDITOR                                  │
│ Appearance│                                          │
│ Auto-Save │  Font family  [Cascadia Mono        ▼]  │
│ Encryption│  Font size    [────●──────────] 14px    │
│ Sync      │  Word wrap    [○] off  [●] on            │
│ Startup   │  Line numbers [●] off  [○] on            │
│ Shortcuts │  Tab size     [●] 2   [○] 4              │
│           │  Ligatures    [●] on                     │
│           │  Minimap      [○] off                    │
│           │  Cursor       [Smooth             ▼]     │
│           │  Whitespace   [None               ▼]     │
│           │  Default lang [plaintext          ▼]     │
│           │                                          │
│           │  ┌──────────────────────────────┐        │
│           │  │  The quick brown fox…        │        │  ← Live preview
│           │  └──────────────────────────────┘        │
└───────────┴─────────────────────────────────────────┘
```

### Settings Sections

**Editor** — font family, font size, word wrap, line numbers, tab size, ligatures, minimap, cursor blinking, render whitespace, default language

**Appearance** — theme (System/Light/Dark), compact tab bar toggle

**Auto-Save** — debounce interval slider (100ms–2000ms)

**Encryption** — encrypt new tabs by default toggle; change passphrase (if passphrase mode); export vault backup; import vault backup; disclaimer notice

**Sync** — sign in/out (shows account avatar + email when signed in); sync enabled toggle; sync interval slider (10s–5min); last synced timestamp; Sync Now button

**Startup** — launch at login toggle; start minimized toggle; close to tray toggle

**Shortcuts** — table of all shortcuts; global shortcut field (click to record new key combo)

### Live Settings Application

Settings changes take effect immediately — no Apply/OK button. Changes are debounced 500ms then sent via `settings:update` IPC:

```typescript
// React: on any setting change
const handleChange = useDebouncedCallback((key, value) => {
  settingsStore.set(key, value);
  ipc.invoke("settings:update", { [key]: value });

  // For Monaco-specific settings: apply immediately to all editor instances
  if (MONACO_OPTIONS.includes(key)) {
    editorRefs.forEach((ref) => ref.current?.updateOptions({ [key]: value }));
  }
}, 500);
```

---

## Windows 11 Polish

### Mica Background

```typescript
// Already set in Phase 1. Phase 4 adds: respect system light/dark changes
nativeTheme.on("updated", () => {
  const isDark = nativeTheme.shouldUseDarkColors;
  win.webContents.send("theme:changed", isDark ? "dark" : "light");
});
```

Renderer listens and calls `monaco.editor.setTheme('notevault-dark' | 'notevault-light')`.

### System Accent Color

Windows 11 exposes the accent color via the registry. Read it on startup and inject as a CSS variable:

```typescript
// main/index.ts
import { systemPreferences } from "electron";
const accent = systemPreferences.getAccentColor(); // e.g. "0078d4ff"
win.webContents.executeJavaScript(
  `document.documentElement.style.setProperty('--color-accent', '#${accent.slice(0, 6)}')`,
);
```

### Animations

CSS transitions for tab bar interactions (keep under 150ms to feel native, not sluggish):

```css
/* Tab appear */
.tab {
  animation: tabIn 120ms ease-out;
}
@keyframes tabIn {
  from {
    opacity: 0;
    transform: scaleX(0.85);
  }
  to {
    opacity: 1;
    transform: scaleX(1);
  }
}

/* Settings panel open */
.settingsOverlay {
  animation: slideIn 180ms cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

/* Command palette */
.palette {
  animation: fadeScale 120ms ease-out;
}
@keyframes fadeScale {
  from {
    opacity: 0;
    transform: scale(0.97);
  }
}
```

---

## Build & Distribution

### NSIS Installer (electron-builder)

The build process is split into two stages:

1. **Build Unpacked (`npm run build:win`)**: Compiles the source and creates the unpacked folder structure in `dist/win-unpacked`. This is the primary command for debugging the final asset structure.
2. **Package Installer (`npm run package:win`)**: Generates the final `.exe` installer for distribution.

```javascript
// package.json (relevant scripts)
{
  "build:win": "npm run build && electron-builder --win --dir",
  "package:win": "npm run build && electron-builder --win"
}
```

```javascript
// electron-builder.yml (already exists)
appId: com.notevault.app
productName: notevault
win:
  executableName: notevault
nsis:
  artifactName: ${name}-${version}-setup.${ext}
  shortcutName: ${productName}
```

### Auto-Update (electron-updater)

```typescript
// src/main/services/UpdateService.ts
import { autoUpdater } from "electron-updater";

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on("update-available", () => {
  win.webContents.send("update:available");
});

autoUpdater.on("update-downloaded", () => {
  win.webContents.send("update:ready"); // Renderer shows "Restart to update" toast
});

export function checkForUpdates() {
  autoUpdater.checkForUpdates();
}
```

Check on launch and every 4 hours thereafter.

### Monaco Bundle Size

With `vite-plugin-monaco-editor` and lazy workers:

| Config                         | Approximate size |
| ------------------------------ | ---------------- |
| Full Monaco (all languages)    | ~5.2MB           |
| Phase 4 (12 languages, lazy)   | ~2.1MB           |
| editor.worker only (plaintext) | ~0.9MB           |

Target: < 2.5MB total Monaco contribution to installer.

### Code Signing

Code signing is **strongly recommended** but not gating v1.0 release. Without it, Windows SmartScreen shows an "Unknown publisher" warning. Steps:

1. Purchase an EV (Extended Validation) code signing certificate from DigiCert, Sectigo, or equivalent
2. Configure in `electron-builder.config.js` via `CSC_LINK` and `CSC_KEY_PASSWORD` env vars in CI
3. SmartScreen reputation builds automatically as installs accumulate

---

## Keyboard Shortcuts (Phase 4 additions)

| Shortcut                     | Action                           | Handler                             |
| ---------------------------- | -------------------------------- | ----------------------------------- |
| `Ctrl+P`                     | Command palette                  | App (overrides Monaco "Go to file") |
| `Ctrl+,`                     | Settings                         | App                                 |
| `Ctrl+Shift+P`               | Pin / Unpin current tab          | App                                 |
| `Ctrl+Shift+E`               | Toggle encryption on current tab | App                                 |
| `Ctrl+Shift+S`               | Force sync now                   | App                                 |
| Click language in status bar | Open language picker             | App                                 |

---

## Acceptance Criteria

- [ ] `Ctrl+P` opens command palette; typing filters both commands and tab names
- [ ] Arrow keys navigate command palette; Enter executes; Escape dismisses
- [ ] Clicking tab language in status bar opens language picker
- [ ] Setting language to `json` on a tab: JSON syntax highlighting appears in Monaco
- [ ] Setting language persists after app restart
- [ ] Settings panel opens with `Ctrl+,` and all sections are reachable
- [ ] Changing font size in settings: Monaco editor updates immediately without restart
- [ ] Changing theme to Dark: Monaco theme switches, Mica tints appropriately
- [ ] System accent color change in Windows: app accent color updates on next launch
- [ ] NSIS installer: produces a working `.exe` installer for x64
- [ ] Auto-update: simulated update available → "Restart to update" toast appears
- [ ] Monaco bundle: total gzipped size < 2.5MB
- [ ] Cold start time remains < 1.5s after Phase 4 additions

---

## Phase 4 → Phase 5 Handoff

Phase 4 delivers a shippable v1.0 product. Phase 5 is additive — it never modifies existing IPC contracts or data models. All Phase 5 features are independently implemented on top of the stable Phase 4 foundation.
