# Phase 2 — Encryption

**NoteVault · [← Master Spec](./spec.md) · [← Phase 1](./phase1.md)**  
**Estimate:** 1 week · **Depends on:** Phase 1 complete · **Delivers:** AES-256-GCM per-tab encryption with unlock screen, working entirely offline.

---

## Goals

By the end of Phase 2, users can mark individual tabs as encrypted. Encrypted tab content is stored as ciphertext and is never written to disk as plaintext. On app launch, an unlock screen appears before any encrypted content is shown. Unencrypted tabs remain accessible immediately without any unlock step.

---

## Deliverables

- `CryptoService` — AES-256-GCM encrypt/decrypt with PBKDF2 key derivation
- Unlock screen (passphrase entry) shown on launch if any encrypted tabs exist
- Per-tab encryption toggle (UI + IPC + storage)
- Lock icon on encrypted tabs in tab bar
- Key derivation upgrades automatically when Google account is added (Phase 3)
- Key rotation on passphrase change
- Export encrypted vault backup to a `.nvault` file
- Import `.nvault` backup

---

## New Files (Phase 2)

```
src/
├── main/
│   ├── ipc/
│   │   └── crypto.ts            # Handles crypto:setEncrypted, crypto:changePassphrase
│   └── services/
│       └── CryptoService.ts     # All key derivation + AES-256-GCM logic
│
└── renderer/
    └── components/
        └── UnlockScreen/
            ├── UnlockScreen.tsx # Passphrase entry overlay shown before app loads
            └── UnlockScreen.module.css
```

**Modified files:**

- `StorageService.ts` — intercepts writes to encrypt content before storage, decrypt on read
- `tabs.ts` (IPC) — adds `crypto:setEncrypted` handler
- `TabItem.tsx` — renders lock icon, adds "Encrypt / Remove Encryption" to context menu
- `StatusBar.tsx` — shows 🔒 indicator when active tab is encrypted

---

## Cryptography Specification

### Key Derivation

Two modes depending on whether a Google account is linked (Phase 3 hooks in here):

```
Mode A — No account (passphrase):
  passphrase + salt → PBKDF2-SHA256(310,000 iterations) → 256-bit key
  salt: 16 random bytes, stored in VaultStore.cryptoMeta.salt

Mode B — Google account (Phase 3 sets this):
  userId + machineId + "notevault-v1" → HKDF-SHA256 → 256-bit key
  No passphrase prompt; key is derived automatically on unlock
```

### Encryption (per encrypt call)

```
plaintext → AES-256-GCM(key, iv=12 random bytes) → ciphertext + authTag(16 bytes)
Stored as: base64( iv[12] || authTag[16] || ciphertext )
```

### Decryption

```
stored → base64 decode → split: iv[0:12], authTag[12:28], ciphertext[28:]
AES-256-GCM-decrypt(key, iv, ciphertext, authTag) → plaintext
If authTag verification fails → throw, show "Decryption failed" error
```

### CryptoService Interface

```typescript
// src/main/services/CryptoService.ts
class CryptoService {
  private key: Buffer | null = null;

  // Called once on unlock; derives and caches the key
  async unlock(passphrase: string): Promise<void>;

  // Used by Phase 3 to set a Google-account-derived key without passphrase
  setKeyFromAccount(userId: string, machineId: string): void;

  // Returns true if unlock() has been called and key is in memory
  isUnlocked(): boolean;

  // Encrypt plaintext → base64 ciphertext string
  encrypt(plaintext: string): string;

  // Decrypt base64 ciphertext → plaintext; throws on auth failure
  decrypt(ciphertext: string): string;

  // Re-encrypt all encrypted tabs with a new key (called on passphrase change)
  async rotateKey(
    newPassphrase: string,
    tabs: Tab[],
    storage: StorageService,
  ): Promise<void>;

  // Wipe the in-memory key (on lock or logout)
  lock(): void;
}
```

---

## StorageService Integration

`StorageService` is the only place content leaves memory. It wraps all writes/reads through `CryptoService`:

```typescript
// On write (tab:update handler)
saveTab(tab: Tab): void {
  const toStore = { ...tab };
  if (tab.encrypted && crypto.isUnlocked()) {
    toStore.content = crypto.encrypt(tab.content);
  } else if (tab.encrypted && !crypto.isUnlocked()) {
    throw new Error('Cannot save encrypted tab: vault is locked');
  }
  store.set(`tabs.${tab.id}`, toStore);
}

// On read (tabs:load)
loadTab(raw: Tab): Tab {
  if (raw.encrypted && crypto.isUnlocked()) {
    return { ...raw, content: crypto.decrypt(raw.content) };
  }
  if (raw.encrypted && !crypto.isUnlocked()) {
    // Return tab with content redacted; renderer shows placeholder
    return { ...raw, content: '' };
  }
  return raw;
}
```

---

## Unlock Screen

Shown as a full-window overlay before `App.tsx` renders tab content. It replaces the editor area (not a modal on top of it) so encrypted content is never visible in the background.

```
┌─────────────────────────────────────────────────────┐
│ ⬡ NoteVault                     [─]  [□]  [✕]      │
├─────────────────────────────────────────────────────┤
│                                                      │
│                  🔒 NoteVault                        │
│                                                      │
│         Your vault is encrypted.                     │
│                                                      │
│         ┌────────────────────────────┐               │
│         │  Enter passphrase...       │               │
│         └────────────────────────────┘               │
│                  [  Unlock  ]                        │
│                                                      │
│         Forgot passphrase? Import backup             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Logic:**

- If NO encrypted tabs exist → skip unlock screen entirely, show app immediately
- If encrypted tabs exist AND passphrase mode → show unlock screen
- If encrypted tabs exist AND Google account mode (Phase 3) → derive key silently, no screen shown
- Wrong passphrase → shake animation, clear input, increment attempt counter
- After 5 failed attempts → 30-second cooldown (display countdown)

---

## IPC Flow — Toggle Encryption on a Tab

```
User right-clicks tab → "Encrypt this tab"
  → renderer: ipc.invoke('crypto:setEncrypted', { tabId, encrypted: true })
  → main: check crypto.isUnlocked()
    if not unlocked → return { error: 'locked' }
    if unlocked:
      load current plaintext content
      encrypt content
      StorageService.saveTab({ ...tab, encrypted: true, content: ciphertext })
      return { ok: true }
  → renderer: update tab.encrypted = true in Zustand
  → TabItem: show lock icon
  → StatusBar: show 🔒
```

Removing encryption is the same flow with `encrypted: false` — decrypt and save plaintext.

---

## VaultStore Additions (Phase 2)

```typescript
interface VaultStore {
  version: number;
  tabs: Tab[];
  settings: UserSettings;
  auth?: AuthState;
  cryptoMeta?: {
    mode: "passphrase" | "account"; // 'account' set by Phase 3
    salt: string; // base64, used in PBKDF2 mode
    pbkdf2Iterations: number; // 310000
  };
}
```

---

## Vault Backup & Import

**Export** (`Ctrl+Shift+B` or Settings → Encryption → Export backup):

- Serialize all tabs (encrypted ones stay as ciphertext, unencrypted ones are encrypted with the current key for the backup)
- Write to a `.nvault` file (JSON with a `"type": "notevault-backup-v1"` header)
- Save dialog opens at `~/Documents`

**Import** (unlock screen "Import backup" link or Settings → Encryption → Import backup):

- Open file dialog → select `.nvault`
- Validate `type` header
- Ask for the backup's passphrase (may differ from current vault)
- Decrypt and merge tabs into current vault (append, no overwrite)

---

## Security Notes

| Concern                        | Handling                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| In-memory key lifetime         | Key lives only in `CryptoService` instance in main process; never sent to renderer |
| Renderer never sees ciphertext | `StorageService.loadTab` decrypts before sending over IPC                          |
| Passphrase never stored        | Only the derived key is kept in memory; wiped on `lock()`                          |
| Auth tag verification          | AES-GCM auth tag failure throws — never silently returns garbled plaintext         |
| Tabs with `encrypted: false`   | Content stored as plaintext — users are warned in Settings                         |
| Clipboard                      | NoteVault does NOT auto-clear clipboard after copy from encrypted tab (v1 scope)   |

**User-facing disclaimer** shown once when first encrypting a tab:

> NoteVault encrypts this tab's content on disk. It is not a password manager — there is no breach monitoring, clipboard clearing, or form-fill. Keep a backup of your passphrase; it cannot be recovered.

---

## Acceptance Criteria

- [ ] App with no encrypted tabs: no unlock screen, launches immediately
- [ ] App with at least one encrypted tab: unlock screen shown before content loads
- [ ] Correct passphrase: all encrypted tabs load with correct content
- [ ] Wrong passphrase: error shown, attempt counter increments, content not shown
- [ ] 5 wrong attempts: 30-second cooldown displayed
- [ ] Right-click tab → "Encrypt this tab": lock icon appears, content unreadable in storage file
- [ ] Right-click tab → "Remove encryption": lock icon removed, content readable in storage file
- [ ] `electron-store` file opened in a text editor: encrypted tab content is ciphertext, not plaintext
- [ ] Passphrase change: all previously encrypted tabs are re-encrypted with new key and still load correctly
- [ ] Export `.nvault` backup: file created, contains no plaintext content
- [ ] Import `.nvault` backup: tabs appear in vault with correct content after passphrase entry
- [ ] Unencrypted tabs always accessible, regardless of vault lock state

---

## Phase 2 → Phase 3 Handoff

`CryptoService` exposes `setKeyFromAccount(userId, machineId)` — a public method Phase 3 calls after successful Google sign-in. This switches the key derivation mode from `passphrase` to `account` and silently re-encrypts all encrypted tabs with the new key. The unlock screen is no longer shown after this point.
