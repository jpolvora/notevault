# Phase 5 — Power Features (v1.1+)
**NoteVault · [← Master Spec](./spec.md) · [← Phase 4](./phase4.md)**  
**Estimate:** 2 weeks (v1.1) + ongoing (v2.0) · **Depends on:** Phase 4 shipped · **Delivers:** Tab groups, full content search, export/import, diff view, and the v2.0 future roadmap.

---

## Goals

Phase 5 extends a stable, shipped v1.0 into a more capable tool. Each feature in this phase is independently shippable — they are designed to not touch core Phase 1–4 systems, only add to them. Features are grouped into v1.1 (committed) and v2.0 (planned).

---

## v1.1 Features

### 5.1 — Tab Groups & Color Labels

Users can assign a color label to any tab and optionally group tabs by color in the tab bar.

**Data model addition:**
```typescript
interface Tab {
  // ... existing fields ...
  color?: TabColor;        // Optional color label
  groupId?: string;        // Optional group UUID
}

type TabColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray';

interface TabGroup {
  id: string;
  label: string;
  color: TabColor;
  collapsed: boolean;
}
```

**UI:**
- Right-click tab → "Label color" → color swatch picker (7 colors)
- Colored dot appears on the left side of the tab chip
- "Group tabs by color" toggle in Settings → Appearance
- When grouped: color-matching tabs cluster together with a thin divider and group label
- Collapse/expand a group by clicking its label

**IPC additions:** `tab:setColor`, `tabGroup:create`, `tabGroup:collapse`

---

### 5.2 — Full Content Search Across All Tabs

Phase 4 adds basic substring search to the command palette. Phase 5 replaces it with a dedicated search panel.

**Trigger:** `Ctrl+Shift+F` (distinct from `Ctrl+H` which is tab-local Find/Replace)

**Panel layout:**
```
┌─────────────────────────────────────────────────────┐
│ 🔍 Search all tabs...                    [✕]        │
│ ☐ Match case   ☐ Whole word   ☐ Regex               │
├─────────────────────────────────────────────────────┤
│ 3 tabs · 12 results                                 │
│                                                      │
│ 📌 Prompts                              4 matches   │
│   Ln 3  │ …use this **query** for…                  │
│   Ln 17 │ …refine the **query** with…              │
│                                                      │
│ 🔒 Credentials                          6 matches   │
│   Ln 2  │ …API **key** for production…             │
│   Ln 5  │ …private **key** location…               │
│                                                      │
│ 📄 Notes                                2 matches   │
│   Ln 1  │ …search **query** result…                │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Implementation using Monaco API:**
```typescript
// For each tab's Monaco model:
const matches = model.findMatches(
  query,
  false,           // searchOnlyEditableRange
  isRegex,         // isRegex
  matchCase,       // matchCase
  wordSeparators,  // wordSeparators (null if not whole-word)
  true             // captureMatches
);
```

Results are rendered in the panel. Clicking a result focuses that tab and calls `editor.revealLineInCenter(lineNumber)` + `editor.setSelection(range)`.

**Encrypted tabs:** searched only when the vault is unlocked. Locked encrypted tabs show "Encrypted — unlock to search" in results.

---

### 5.3 — Export & Import

**Export tab** (`Ctrl+Shift+X` or right-click → Export):
- Plain text: `.txt`
- Markdown: `.md`
- JSON: `.json`
- All tabs as zip: `.zip` of individual `.txt` files

**Import file as new tab** (drag-and-drop onto tab bar, or File menu):
- Accepts: `.txt`, `.md`, `.json`, `.js`, `.ts`, `.py`, `.sql`, `.yaml`, `.xml`, `.html`, `.css`
- Tab label defaults to filename (without extension)
- Language mode auto-detected from file extension

**Drag-and-drop implementation:**
```typescript
// TabBar.tsx — drop zone
<div
  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
  onDrop={e => {
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => ipc.invoke('tab:importFile', file.path));
  }}
>
```

---

### 5.4 — Vault Backup & Import (Full)

Phase 2 delivers the `CryptoService` backup logic. Phase 5 delivers the complete user-facing UI and additional formats.

**Export** (Settings → Encryption → Export backup):
- Full encrypted vault as `.nvault` (all tabs, settings minus auth tokens)
- Individual encrypted tab as `.nvtab`
- Both are binary formats defined in Phase 3

**Import**:
- `.nvault`: full vault restore — prompts "Merge with current tabs?" or "Replace all tabs?"
- `.nvtab`: single tab import, appended to current vault
- Passphrase prompt if the backup was created with a different passphrase

---

### 5.5 — Monaco Diff View

Compare the current tab's local content with its last-synced remote version.

**Trigger:** Right-click tab → "Show changes since last sync"

**Implementation:**
```typescript
// Use Monaco's diff editor
import { DiffEditor } from '@monaco-editor/react';

<DiffEditor
  original={tab.lastSyncedContent}   // Stored alongside tab in Phase 3
  modified={tab.content}
  language={tab.language}
  options={{
    renderSideBySide: true,
    readOnly: true,
    minimap: { enabled: false },
  }}
/>
```

`tab.lastSyncedContent` is stored (unencrypted in-memory, encrypted on disk) each time a successful sync push completes.

**Data model addition:**
```typescript
interface Tab {
  // ... existing fields ...
  lastSyncedContent?: string;  // In-memory only; cleared on app restart
  lastSyncedAt?: number;       // Unix ms
}
```

---

## v2.0 Roadmap

These features are planned but not committed. They require more significant architectural changes or third-party integrations.

---

### 5.6 — Markdown Preview Mode

Per-tab toggle between plain editor and split editor/preview.

- Trigger: `Ctrl+Shift+M` or status bar "MD" indicator click
- Split view: Monaco on left, rendered HTML on right
- Renderer: `marked` + `DOMPurify` for safe HTML output
- Sync scroll between editor and preview panes
- Stored as `tab.previewMode: boolean`

**Architecture note:** Preview pane is a separate `<div>` with `innerHTML` set from `marked(content)`. It sits alongside the Monaco instance, not inside it.

---

### 5.7 — Additional Sync Providers

After Google Drive, next providers in priority order:

| Provider | API | Auth |
|---|---|---|
| Microsoft OneDrive | Microsoft Graph API | OAuth 2.0 PKCE |
| Dropbox | Dropbox API v2 | OAuth 2.0 PKCE |
| iCloud Drive | CloudKit JS | Apple ID |

**Architecture:** `SyncService` is refactored to use a `SyncProvider` interface:
```typescript
interface SyncProvider {
  push(tabId: string, content: Buffer): Promise<string>;  // Returns remote file ID
  pull(remoteId: string): Promise<Buffer>;
  listManifest(): Promise<ManifestEntry[]>;
  deleteRemote(remoteId: string): Promise<void>;
}
```

Each provider implements this interface. `SyncService` holds a reference to the active provider and is otherwise unchanged.

---

### 5.8 — Three-Way Merge Conflict Resolution

Replace the "last-write-wins" conflict resolution from Phase 3 with a proper three-way merge.

- When `local.updatedAt` and `remote.updatedAt` are both ahead of `lastSyncedAt` (diverged)
- Compute diff3 merge using `node-diff3` or similar
- If auto-merge succeeds → apply silently
- If conflicts → open Monaco diff view showing both versions, let user pick or manually merge

---

### 5.9 — Mobile Companion App (Read-Only)

A React Native app (iOS + Android) for reading NoteVault tabs on mobile. Read-only in v2.0.

- Authenticates with the same Google account
- Downloads and decrypts tabs from Drive appdata
- Same AES-256-GCM decryption via React Native Crypto API
- Displays tabs in a list; tap to open full content
- Copy-to-clipboard button on each tab

---

### 5.10 — Snippet Library

A read-only tab type for reusable templates.

```typescript
interface SnippetTab extends Tab {
  type: 'snippet';          // New tab type (default tabs have no 'type' field)
  triggerKeyword: string;   // e.g. "gpt4", "sql-select"
}
```

- Snippets appear in a separate "Library" section of the tab bar
- Cannot be edited directly — click "Use snippet" → creates a new regular tab with the snippet content
- Snippets can be synced and shared (public `syncId` flag)
- Command palette: type `>` + keyword to instantly create a tab from a snippet

---

### 5.11 — Browser Extension ("Send to NoteVault")

A Chrome/Edge extension for one-click sending of selected text or the full page URL to a new NoteVault tab.

- Extension communicates with NoteVault desktop app via `chrome.runtime.connectNative`
- NativeMessaging host registered during NoteVault install
- Sends `{ action: 'newTab', content: selectedText, label: pageTitle }`
- NoteVault creates the tab silently in the background, shows a toast notification

---

## Acceptance Criteria (v1.1 only)

- [ ] Tab color label: right-click → pick color → colored dot appears on tab
- [ ] `Ctrl+Shift+F` opens search panel; results show across all unlocked tabs
- [ ] Clicking a search result focuses the correct tab and highlights the match
- [ ] Encrypted locked tabs show "Encrypted — unlock to search" placeholder
- [ ] Drag `.txt` file onto tab bar → new tab created with file content and filename as label
- [ ] Export tab as `.txt` → file saved to Downloads with correct content
- [ ] Export all tabs as `.zip` → zip contains one file per tab, all with correct content
- [ ] Right-click tab → "Show changes since last sync" → diff view opens with correct diffs
- [ ] Diff view is read-only; closing it returns to normal edit mode
- [ ] `.nvault` export/import round-trip: export vault, clear all tabs, import backup → all tabs restored correctly

---

*All v2.0 features are subject to revision based on v1.0 user feedback.*
