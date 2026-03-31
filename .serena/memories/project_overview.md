# Project Overview: NoteVault

NoteVault is a secure, synced, multi-tab text editor for Windows 11. It's designed for power users who need a fast, keyboard-friendly scratchpad with encryption and cloud sync.

## Tech Stack
- **Shell:** Electron v30+
- **Frontend:** React 18
- **Editor:** Monaco Editor (via `@monaco-editor/react`)
- **Language:** TypeScript
- **State Management:** Zustand
- **Styling:** CSS Modules + CSS Variables
- **Persistence:** `electron-store` (AES-256 encrypted JSON)
- **Networking/Sync:** Google Drive API v3 (OAuth 2.0 PKCE)
- **Crypto:** Node.js `crypto` (AES-256-GCM)

## Key Directories
- `src/main`: Main process code (Electron services, lifecycle)
- `src/renderer`: Foreground UI code (React components, stores)
- `src/preload`: IPC bridge between main and renderer
- `src/shared`: Common types and utilities used by both processes
