# 📔 NoteVault - The Secure, Fluent Developer Notepad

NoteVault is a high-performance, secure notepad designed for developers. It combines the aesthetics of Windows 11 Fluent design with the power of Monaco (VS Code) editor and AES-256-GCM encryption.

## ✨ Latest Features (v1.0.1)

### 🎨 Organization & Search
- **Tab Color Labels**: Group tasks with 7 color-coded markers.
- **Dynamic Grouping**: Automatically cluster tabs by color with custom dividers in the Tab Bar.
- **Global Search (Ctrl+Shift+F)**: Search throughout all unlocked tabs with Regex support.

### 🔒 Security at its Core
- **Vault-Level Locking**: Your tabs stay encrypted and redacted until you provide your vault passphrase.
- **AES-256-GCM**: Military-grade encryption for each tab's content.
- **Offline First**: All data is stored locally, with optional **Google Drive Cloud Sync**.

### 🛠️ Developer Productivity 
- **Tab Archiving**: Never lose a note. Closing a tab archives it for easy recovery.
- **Typography settings**: Choose from Cascadia Mono, Fira Code, or your system favorites.
- **Utility Menu**: Instant MD5/SHA hashes, UUID generation, and formatting direct to your editor.
- **Horizontal Tab Scrolling**: Smoothly navigate dozens of open tabs.

## 🚀 Getting Started

### 1. Clone & Install
Ensure you have Node.js (v18+) and npm installed.
```bash
# Clone the repository
$ git clone https://github.com/jone/notevault.git
$ cd notevault

# Install dependencies
$ npm install
```

### 2. Run Locally (Development)
```bash
$ npm run dev
```

### 3. Build & Distribution
Generate a production-ready installer for your platform.
```bash
# For Windows (Includes Windows 11 Mica material support)
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

## 🏗️ Architecture
- **Framework**: Electron + React 19 + TypeScript.
- **Editor**: Monaco Editor (The engine behind VS Code).
- **State Management**: Zustand for rapid renderer-side updates.
- **Security**: Node `crypto` module for high-entropy key derivation (PBKDF2).
- **Storage**: `electron-store` with AES-256 encrypted JSON.
- **Cloud**: Google Drive API (Drive App Data Scope).

---
*Built with ❤️ for focused, secure coding.*
