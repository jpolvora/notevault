# 📔 NoteVault - The Secure, Fluent Developer Notepad

NoteVault is a high-performance, secure notepad designed for developers. It combines the aesthetics of Windows 11 Fluent design with the power of Monaco (VS Code) editor and AES-256-GCM encryption.

## ✨ Latest Features (v1.0.4)

### 🎨 Organization & Search

- **Tab Color Labels**: Group tasks with 7 color-coded markers.
- **Dynamic Grouping**: Automatically cluster tabs by color with custom dividers in the Tab Bar.
- **Global Search (Ctrl+Shift+F)**: Search throughout all unlocked tabs with Regex support.

### 🔒 Security at its Core

- **BYOC (Bring Your Own Credentials)**: Configure your personal Google Drive API credentials (Client ID/Secret) for ultimate privacy and control.
- **Vault-Level Locking**: Your tabs stay encrypted and redacted until you provide your vault passphrase.
- **AES-256-GCM**: Military-grade encryption for each tab's content.
- **Offline First**: All data is stored locally, with optional **Google Drive Cloud Sync**.

### 🛠️ Developer Productivity

- **Tab Archiving**: Never lose a note. Closing a tab archives it for easy recovery.
- **Typography settings**: Choose from Cascadia Mono, Fira Code, or your system favorites.
- **Utility Menu**: Instant MD5/SHA hashes, UUID generation, and formatting direct to your editor.
- **Horizontal Tab Scrolling**: Smoothly navigate dozens of open tabs.

## 🚀 Getting Started

### 💾 Download & Install

For the best experience, download the latest stable installer from our **[GitHub Releases](https://github.com/jpolvora/notevault/releases)** page.

- **Current Version**: v1.0.4
- **Platform**: Windows 11 / 10 (x64, arm64)

### 🏗️ Local Development

If you want to contribute or build from source, ensure you have Node.js (v20+) and npm installed.

```bash
# Clone the repository
$ git clone https://github.com/jpolvora/notevault.git
$ cd notevault

# Install dependencies
$ npm install
```

### 🛰️ Cloud Sync & BYOC Setup (Required for Sync)

To enable Google Drive Cloud Sync, you must provide your own Google Cloud API credentials in the **Settings > Cloud Sync** page. This ensures only you have access to your sync data.

1.  Go to the **[Google Cloud Console](https://console.cloud.google.com/)**.
2.  Create a project and enable the **Google Drive API**.
3.  Configure the **OAuth Consent Screen** (Internal or External).
    - Scope required: `./auth/drive.appdata` (App-specific data folder).
4.  Create **OAuth 2.0 Client IDs** (Application type: *Desktop App*).
5.  Download the **JSON configuration** file.
6.  In NoteVault, go to **Settings > Cloud Sync**, click **Upload JSON**, then **Test Configuration**.
7.  Once validated, you can **Sign In with Google** and enable sync.

### 2. Run Locally (Development)

```bash
$ npm run dev
```

### 3. Build & Packaging

Generate production builds or installers for your platform.

#### 📦 Development Builds (Unpacked)

Use these for quick verification of the final asset structure without generating a full installer.

```bash
# Windows
$ npm run build:win

# macOS
$ npm run build:mac

# Linux
$ npm run build:linux
```

#### 🚀 Distributable Installers

Generate the final setup files for distribution.

```bash
# Windows (.exe)
$ npm run package:win

# macOS (.dmg)
$ npm run package:mac

# Linux (.AppImage, .deb)
$ npm run package:linux
```

## 🏗️ Architecture

- **Framework**: Electron + React 19 + TypeScript.
- **Editor**: Monaco Editor (The engine behind VS Code).
- **State Management**: Zustand for rapid renderer-side updates.
- **Security**: Node `crypto` module for high-entropy key derivation (PBKDF2).
- **Storage**: `electron-store` with AES-256 encrypted JSON.
- **Cloud**: Google Drive API (Drive App Data Scope).

### 📘 Project Documentation

Detailed specifications and technical roadmaps can be found in the [**specs/**](./specs/) directory:
- [Master Specification](./specs/spec.md)
- [Phase 1: Shell, Tabs & Editor](./specs/phase1.md)
- [Phase 2: Encryption](./specs/phase2.md)
- [Phase 3: Cloud Sync](./specs/phase3.md)
- [Phase 4: Polish & Settings](./specs/phase4.md)
- [Phase 5: Power Features](./specs/phase5.md)
- [Phase 6: UX Polish & Utilities](./specs/phase6.md)

---

_Built with ❤️ for focused, secure coding._
