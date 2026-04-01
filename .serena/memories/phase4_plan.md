# Phase 4: Polish & Settings

Phase 4 focuses on turning the functional foundation into a production-ready application.

## Key Features to Implement

1. **Settings Panel:** Full-window React overlay with categories (Editor, Appearance, etc.)
2. **Command Palette (`Ctrl+P`):** Fuzzy search for commands and tabs.
3. **Language Selector:** Per-tab syntax highlighting with lazy loading of Monaco workers.
4. **Windows 11 Polish:** Mica effect, system accent color integration, and UI animations.
5. **Distribution:** Signed installer and auto-update mechanism.

## Required IPC Additions

- `settings:update`: Persist settings changes from renderer to main process.
- `theme:changed`: Notify renderer when system theme changes.

## New Dependencies to Check

- `vite-plugin-monaco-editor` is already in `package.json`.
- `electron-updater` is not yet in `package.json` (may need to be added).
