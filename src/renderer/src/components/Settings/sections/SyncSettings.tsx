import React, { useEffect, useState } from 'react';
import { useUIStore } from '../../../store/ui';
import styles from '../Settings.module.css';

export const SyncSettings: React.FC = () => {
  const { settings, updateSettings } = useUIStore();
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const checkStatus = async () => {
    const status = await window.api.getAuthStatus();
    setAuthStatus(status);
  };

  useEffect(() => {
    checkStatus();
  }, []);

  if (!settings) return null;

  const handleLogin = async () => {
    await window.api.login();
    checkStatus();
  };

  const handleLogout = async () => {
    await window.api.logout();
    checkStatus();
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await window.api.syncNow();
    setIsSyncing(false);
  };

  return (
    <div className={styles.section}>
      <h2>Cloud Sync</h2>
      <p className={styles.description}>
        Securely sync your tabs across devices using Google Drive (App Data folder).
      </p>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Google Account</label>
          <span className={styles.description}>
            {authStatus?.email ? `Signed in as ${authStatus.email}` : 'Not signed in'}
          </span>
        </div>
        {authStatus?.email ? (
          <button className={styles.button} onClick={handleLogout}>Sign Out</button>
        ) : (
          <button className={styles.primaryButton} onClick={handleLogin}>Sign In with Google</button>
        )}
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Enable Sync</label>
          <span className={styles.description}>Automatically push and pull changes.</span>
        </div>
        <input 
          type="checkbox" 
          checked={settings.syncEnabled}
          onChange={(e) => updateSettings({ syncEnabled: e.target.checked })}
          className={styles.checkbox}
          disabled={!authStatus?.email}
        />
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Sync Interval</label>
          <span className={styles.description}>How often to check for remote changes (default: 30s).</span>
        </div>
        <select 
          value={settings.syncInterval}
          onChange={(e) => updateSettings({ syncInterval: parseInt(e.target.value) })}
          className={styles.select}
          disabled={!settings.syncEnabled}
        >
          <option value="15000">15 Seconds</option>
          <option value="30000">30 Seconds</option>
          <option value="60000">1 Minute</option>
          <option value="300000">5 Minutes</option>
        </select>
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Sync Now</label>
          <span className={styles.description}>Force an immediate synchronization cycle.</span>
        </div>
        <button 
          className={styles.button} 
          onClick={handleSyncNow}
          disabled={!authStatus?.email || isSyncing}
        >
          {isSyncing ? 'Syncing...' : 'Force Sync'}
        </button>
      </div>
    </div>
  );
};
