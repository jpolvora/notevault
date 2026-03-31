import { Tab } from '../../shared/types';
import { storageService } from './StorageService';
import { authService } from './AuthService';
import { cryptoService } from './CryptoService';

interface RemoteManifest {
  tabs: {
    id: string;
    syncId: string;
    updatedAt: number;
    deletedAt?: number;
    label?: string; // Cache label in manifest for easy listing
  }[];
}

class SyncService {
  private isSyncing = false;

  async init() {
    this.startSyncLoop();
  }

  private startSyncLoop() {
    const interval = storageService.getSettings().syncInterval || 30000;
    setTimeout(async () => {
      await this.sync();
      this.startSyncLoop();
    }, interval);
  }

  async sync(): Promise<void> {
    if (this.isSyncing || !authService.isSignedIn()) return;
    this.isSyncing = true;
    console.log('[SyncService] Starting sync cycle...');

    try {
      const token = await authService.refreshIfNeeded();
      
      // 1. Get/Create Remote Manifest
      const manifestResult = await this.getOrCreateManifest(token);
      let remoteManifest = manifestResult.manifest;
      const manifestId = manifestResult.id;

      const localTabs = storageService.getTabs();
      const updatedLocalTabs = [...localTabs];
      let manifestChanged = false;

      // 2. PUSH: Process local changes
      for (const localTab of localTabs) {
        if (localTab.deletedAt && !localTab.syncId) continue; // Deleted locally and not on remote

        const remoteEntry = remoteManifest.tabs.find(t => t.id === localTab.id);
        
        if (!remoteEntry || localTab.updatedAt > remoteEntry.updatedAt) {
          console.log(`[SyncService] Pushing tab: ${localTab.label} (${localTab.id})`);
          try {
            const syncId = await this.pushTab(token, localTab);
            if (!remoteEntry) {
              remoteManifest.tabs.push({
                id: localTab.id,
                syncId,
                updatedAt: localTab.updatedAt,
                deletedAt: localTab.deletedAt,
                label: localTab.label
              });
            } else {
              remoteEntry.syncId = syncId;
              remoteEntry.updatedAt = localTab.updatedAt;
              remoteEntry.deletedAt = localTab.deletedAt;
              remoteEntry.label = localTab.label;
            }
            // Update local tab with syncId if it didn't have one
            const idx = updatedLocalTabs.findIndex(t => t.id === localTab.id);
            updatedLocalTabs[idx] = { 
                ...localTab, 
                syncId,
                lastSyncedContent: localTab.content,
                lastSyncedAt: Date.now()
            };
            manifestChanged = true;
          } catch (e) {
            console.error(`[SyncService] Failed to push tab ${localTab.id}:`, e);
            this.enqueueOperation('push', localTab.id);
          }
        }
      }

      // 3. PULL: Process remote changes
      for (const remoteEntry of remoteManifest.tabs) {
        const localTab = localTabs.find(t => t.id === remoteEntry.id);
        
        if (!localTab || remoteEntry.updatedAt > localTab.updatedAt) {
          console.log(`[SyncService] Pulling tab: ${remoteEntry.id}`);
          try {
            if (remoteEntry.deletedAt) {
                // If soft-deleted on remote, update local
                if (!localTab) {
                    // Don't create locally if already deleted
                } else {
                    const idx = updatedLocalTabs.findIndex(t => t.id === remoteEntry.id);
                    updatedLocalTabs[idx] = { ...localTab, deletedAt: remoteEntry.deletedAt };
                }
            } else {
                const pulledTab = await this.pullTab(token, remoteEntry.id, remoteEntry.syncId);
                if (!localTab) {
                    updatedLocalTabs.push({
                        ...pulledTab,
                        id: remoteEntry.id,
                        syncId: remoteEntry.syncId,
                        order: localTabs.length,
                        pinned: false,
                        encrypted: true, // Synced tabs are always encrypted on Drive
                        language: 'plaintext'
                    } as Tab);
                } else {
                    const idx = updatedLocalTabs.findIndex(t => t.id === remoteEntry.id);
                    updatedLocalTabs[idx] = {
                        ...localTab,
                        ...pulledTab,
                        syncId: remoteEntry.syncId,
                        lastSyncedContent: pulledTab.content,
                        lastSyncedAt: Date.now()
                    };
                }
            }
          } catch (e) {
            console.error(`[SyncService] Failed to pull tab ${remoteEntry.id}:`, e);
          }
        }
      }

      // 4. Save manifest if changed
      if (manifestChanged) {
        await this.updateManifest(token, manifestId, remoteManifest);
      }

      // 5. Update local storage
      storageService.setTabs(updatedLocalTabs);
      storageService.setSyncMeta({
        lastSyncAt: Date.now(),
        manifestEtag: manifestResult.etag
      });

    } catch (e) {
      console.error('[SyncService] Sync failed:', e);
    } finally {
      this.isSyncing = false;
    }
  }

  private async getOrCreateManifest(token: string): Promise<{ manifest: RemoteManifest, id: string, etag: string }> {
    const listRes = await fetch('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name="manifest.json"', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const list = await listRes.json();
    
    if (list.files && list.files.length > 0) {
      const fileId = list.files[0].id;
      const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const manifest = await contentRes.json();
      return { manifest, id: fileId, etag: contentRes.headers.get('ETag') || '' };
    } else {
      // Create manifest
      const manifest: RemoteManifest = { tabs: [] };
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'manifest.json',
          parents: ['appDataFolder']
        })
      });
      const file = await createRes.json();
      await this.updateManifest(token, file.id, manifest);
      return { manifest, id: file.id, etag: '' };
    }
  }

  private async updateManifest(token: string, fileId: string, manifest: RemoteManifest) {
    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(manifest)
    });
  }

  private async pushTab(token: string, tab: Tab): Promise<string> {
    const content = this.serializeTab(tab);
    
    if (tab.syncId) {
      // Update
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${tab.syncId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream'
        },
        body: new Uint8Array(content)
      });
      return tab.syncId;
    } else {
      // Create
      const fileName = `${tab.id}.nvtab`;
      // Multipart upload for metadata + content in one go is better, but doing it simple:
      const metaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: fileName,
          parents: ['appDataFolder']
        })
      });
      const file = await metaRes.json();
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=media`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream'
        },
        body: new Uint8Array(content)
      });
      return file.id;
    }
  }

  private async pullTab(token: string, id: string, syncId: string): Promise<Partial<Tab>> {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${syncId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const buffer = Buffer.from(await res.arrayBuffer());
    return this.deserializeTab(buffer, id);
  }

  private serializeTab(tab: Tab): Buffer {
    const magic = Buffer.from('NVAB');
    const version = Buffer.alloc(4); version.writeUInt32BE(1);
    const updatedAt = Buffer.alloc(8); updatedAt.writeBigUInt64BE(BigInt(tab.updatedAt));
    const labelBuf = Buffer.from(tab.label, 'utf8');
    const labelLength = Buffer.alloc(2); labelLength.writeUInt16BE(labelBuf.length);
    
    // Always encrypt for sync
    const encryptedContent = cryptoService.encrypt(tab.content);
    const combined = Buffer.from(encryptedContent, 'base64');
    
    return Buffer.concat([
      magic,
      version,
      updatedAt,
      labelLength,
      labelBuf,
      combined
    ]);
  }

  private deserializeTab(buf: Buffer, _id: string): Partial<Tab> {
    const magic = buf.subarray(0, 4).toString();
    if (magic !== 'NVAB') throw new Error('Invalid magic');
    // Version check ignored for v1
    const updatedAt = Number(buf.readBigUInt64BE(8));
    const labelLength = buf.readUInt16BE(16);
    const label = buf.subarray(18, 18 + labelLength).toString('utf8');
    const combined = buf.subarray(18 + labelLength).toString('base64');
    
    const content = cryptoService.decrypt(combined);
    
    return {
      label,
      content,
      updatedAt
    };
  }

  private enqueueOperation(type: 'push' | 'delete', tabId: string) {
    const queue = storageService.getSyncQueue();
    // Don't duplicate operations for same tab
    if (queue.some(op => op.tabId === tabId && op.type === type)) return;
    
    queue.push({
      type,
      tabId,
      enqueuedAt: Date.now()
    });
    storageService.setSyncQueue(queue);
  }

  async flushQueue() {
    const queue = storageService.getSyncQueue();
    if (queue.length === 0 || this.isSyncing) return;
    
    console.log(`[SyncService] Flushing ${queue.length} queued operations...`);
    
    // We'll just call sync() as it naturally processes all tabs with updated times.
    // However, if it's a "delete" operation, we might need special handling.
    // In our current simple sync, "delete" is represented by deletedAt.
    // So sync() WILL push those changes too.
    await this.sync();
    
    // If sync succeeded, we can clear the queue (this is a simplified approach)
    storageService.setSyncQueue([]);
  }
}

export const syncService = new SyncService();
