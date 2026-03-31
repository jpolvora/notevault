# Phase 3 — Cloud Sync
**NoteVault · [← Master Spec](./spec.md) · [← Phase 2](./phase2.md)**  
**Estimate:** 1.5 weeks · **Depends on:** Phase 2 complete · **Delivers:** Google sign-in, Drive sync, offline queue, multi-device tab union.

---

## Goals

By the end of Phase 3, users can sign in with their Google account and have all tabs silently synced to Google Drive's app-isolated storage. Tabs are encrypted before upload — Google never sees plaintext. The app works fully offline and flushes pending operations when reconnected. Multiple devices see a union of all tabs.

---

## Deliverables

- Google OAuth 2.0 PKCE sign-in flow (no client secret required)
- `AuthService` — token storage, refresh, revocation
- `SyncService` — push/pull with Google Drive appdata scope
- Pre-upload encryption (Phase 2 `CryptoService` integration)
- Sync status in status bar (idle / syncing / error)
- Offline queue — pending operations persisted, flushed on reconnect
- Multi-device tab union (soft-delete with `deletedAt`, "delete everywhere" confirmation)
- Sync settings: interval, enable/disable, force sync now
- Account info in status bar (avatar, email)

---

## New Files (Phase 3)

```
src/
├── main/
│   ├── ipc/
│   │   ├── auth.ts              # auth:login, auth:logout handlers
│   │   └── sync.ts              # sync:now, sync:status handlers
│   └── services/
│       ├── AuthService.ts       # OAuth PKCE flow, token storage/refresh
│       └── SyncService.ts       # Drive API push/pull, conflict resolution, offline queue
│
└── renderer/
    └── components/
        └── AccountButton/
            ├── AccountButton.tsx     # Avatar/email in status bar; sign-in prompt if not authed
            └── AccountButton.module.css
```

**Modified files:**
- `StatusBar.tsx` — sync status chip + account button
- `CryptoService.ts` — `setKeyFromAccount()` called here after sign-in
- `StorageService.ts` — `VaultStore.auth` and `syncQueue` now populated
- `Settings/` (Phase 4 will render the UI; Phase 3 adds the data layer)

---

## OAuth 2.0 PKCE Flow

NoteVault uses the **installed app PKCE flow** — no client secret, safe for desktop apps.

```
1. Generate code_verifier (random 64 bytes, base64url-encoded)
2. code_challenge = base64url(SHA256(code_verifier))
3. Open system browser to:
   https://accounts.google.com/o/oauth2/v2/auth
     ?client_id=<CLIENT_ID>
     &redirect_uri=http://127.0.0.1:<random_port>
     &response_type=code
     &scope=https://www.googleapis.com/auth/drive.appdata
     &code_challenge=<code_challenge>
     &code_challenge_method=S256
4. Spin up a one-shot HTTP server on the random port
5. Browser redirects → server receives ?code=...
6. POST to https://oauth2.googleapis.com/token with code + code_verifier
7. Receive { access_token, refresh_token, expires_in }
8. Store both tokens encrypted via CryptoService in VaultStore.auth
9. Call CryptoService.setKeyFromAccount(userId, machineId)
   → switches key derivation mode, re-encrypts encrypted tabs silently
10. Close the temporary HTTP server
```

```typescript
// src/main/services/AuthService.ts
class AuthService {
  async signIn(): Promise<AuthState>           // Runs PKCE flow above
  async signOut(): Promise<void>               // Revokes token, clears VaultStore.auth
  async refreshIfNeeded(): Promise<string>     // Returns valid access_token
  getStoredAuth(): AuthState | null
  isSignedIn(): boolean
}
```

**Google API Console setup required:**
- Application type: Desktop app
- Authorized redirect URIs: `http://127.0.0.1` (loopback, any port allowed)
- Scope: `https://www.googleapis.com/auth/drive.appdata`

---

## Google Drive Storage Model

All files live in the **appdata folder** — isolated to NoteVault, invisible in Drive UI.

```
Drive appdata/
├── manifest.json          # Tab index: { tabs: [{ id, syncId, updatedAt, deletedAt }] }
└── tabs/
    ├── <tab-uuid>.nvtab   # Encrypted tab content (binary blob)
    ├── <tab-uuid>.nvtab
    └── ...
```

`manifest.json` is a lightweight index — the app syncs it first to know which tabs exist remotely, then fetches individual `.nvtab` files only when needed.

### `.nvtab` File Format

```
Binary layout:
  [4 bytes]  magic: 0x4E564142 ("NVAB")
  [4 bytes]  version: uint32 = 1
  [8 bytes]  updatedAt: uint64 unix ms
  [2 bytes]  labelLength: uint16
  [N bytes]  label: UTF-8
  [12 bytes] iv
  [16 bytes] authTag
  [M bytes]  ciphertext (encrypted tab content)
```

This keeps metadata (label, timestamp) readable for manifest operations without decrypting the full content.

---

## SyncService

```typescript
class SyncService {
  // Main sync loop — called on interval and on app focus
  async sync(): Promise<void>

  // Push local changes to Drive
  private async push(tabs: Tab[]): Promise<void>

  // Pull remote changes from Drive
  private async pull(): Promise<Tab[]>

  // Merge remote tabs into local store
  private merge(local: Tab[], remote: Tab[]): Tab[]

  // Enqueue an operation for offline retry
  private enqueue(op: SyncOperation): void

  // Flush the offline queue (called on network reconnect)
  async flushQueue(): Promise<void>
}

interface SyncOperation {
  type: 'push' | 'delete';
  tabId: string;
  enqueuedAt: number;
}
```

### Sync Flow (every 30s + on app focus)

```
SyncService.sync()
  1. refreshIfNeeded() — ensure valid access_token
  2. Fetch manifest.json from Drive
  3. PUSH: for each local tab where local.updatedAt > remote.updatedAt (or no remote entry):
       encrypt content → upload .nvtab → update manifest entry
  4. PULL: for each remote tab where remote.updatedAt > local.updatedAt:
       download .nvtab → decrypt → update local tab in store
  5. NEW on remote: tab in manifest with no local match → create local tab
  6. Upload updated manifest.json
  7. Emit sync:status 'idle' to renderer
```

### Conflict Resolution (v1)

**Last-write-wins** using `updatedAt` timestamp. The device with the higher `updatedAt` wins.

```
local.updatedAt > remote.updatedAt  →  push local, overwrite remote
remote.updatedAt > local.updatedAt  →  pull remote, overwrite local
equal timestamps                    →  no-op
```

*Three-way merge is planned for Phase 5 / v2.0.*

---

## Multi-Device Behavior

| Action | Behavior |
|---|---|
| Create tab on device A | Appears on device B at next sync |
| Edit tab on device A | device B gets the update (last-write-wins) |
| Close (delete) tab on device A | Tab is **soft-deleted** (`deletedAt` set) — still visible on device B |
| Confirm "delete everywhere" | `deletedAt` written to manifest; all devices remove it at next sync |
| Soft-deleted tab after 7 days | Permanently removed from manifest and Drive storage |

The manifest carries `deletedAt` so devices that were offline can reconcile deletions correctly.

---

## Offline Queue

When a sync push fails (no network, token expired, Drive API error), the operation is added to a persisted queue:

```typescript
// Stored in electron-store under 'syncQueue'
interface SyncQueue {
  operations: SyncOperation[];
  lastFlushAttempt: number;
}
```

On reconnect (detected via `net.isOnline()` polling every 10s or `app` `online` event), `SyncService.flushQueue()` replays operations in order.

---

## Status Bar Sync Indicator

The status bar chip shows real-time sync state:

| State | Display |
|---|---|
| Signed out | `Sign in` link |
| Idle, synced | `☁ Synced · 2m ago` |
| Syncing | `↻ Syncing…` (animated) |
| Queued (offline) | `⏸ Offline · 3 queued` |
| Error | `⚠ Sync error` (click for details) |

---

## Security Notes

| Concern | Handling |
|---|---|
| Drive scope | `drive.appdata` only — NoteVault cannot read/write any user file |
| Tokens at rest | Stored encrypted via AES-256-GCM in `VaultStore.auth` |
| Content on Drive | Always ciphertext — NoteVault encrypts before upload regardless of per-tab `encrypted` flag during sync (sync always encrypts) |
| Token refresh | Done silently in main process; renderer never sees raw tokens |
| Sign-out | Access token revoked via `https://oauth2.googleapis.com/revoke`; local tokens wiped; key switches back to passphrase mode |
| Account switch | Signing in with a different account triggers key rotation — all content re-encrypted with new account-derived key |

---

## VaultStore Additions (Phase 3)

```typescript
interface VaultStore {
  // ... Phase 1 & 2 fields ...
  auth?: AuthState;          // Now populated
  syncQueue: SyncOperation[]; // Offline queue
  syncMeta: {
    lastSyncAt: number;      // Unix ms
    manifestEtag: string;    // Drive ETag for optimistic concurrency
  };
}
```

---

## Acceptance Criteria

- [ ] Sign-in button opens system browser; Google consent screen appears
- [ ] After consent, app receives tokens without any manual step
- [ ] `drive.appdata` folder created in Drive with `manifest.json`
- [ ] Creating a tab on device A: visible on device B after next sync cycle
- [ ] Editing a tab on both devices simultaneously: last-write-wins, no crash
- [ ] Disconnect network: app continues to work, operations queued
- [ ] Reconnect network: queued operations flush, sync resumes
- [ ] Status bar shows correct sync state for all states (idle/syncing/offline/error)
- [ ] Open Drive in browser: `appdata` folder not visible in normal file list
- [ ] Sign out: tokens revoked, `VaultStore.auth` cleared, key mode reverts to passphrase
- [ ] No plaintext content ever written to Drive (verify by downloading `.nvtab` raw and confirming ciphertext)
- [ ] Soft-delete: closing tab on one device does not remove it from other device until "delete everywhere" is confirmed

---

## Phase 3 → Phase 4 Handoff

Phase 3 delivers a data layer for sync and auth. Phase 4 wires up the Settings panel UI to expose `AuthService` sign-in/out and `SyncService` configuration to the user. No new data contracts are needed — Phase 4 is purely renderer-side settings UI calling existing IPC channels.
