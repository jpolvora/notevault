import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../../store/ui';
import styles from '../Settings.module.css';

export const EncryptionSettings: React.FC = () => {
  const { settings, updateSettings } = useUIStore();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [showStatus, setShowStatus] = useState<string | null>(null);


  const checkStatus = async () => {
    const unlocked = await window.api.isUnlocked();
    setIsUnlocked(unlocked);
  };

  useEffect(() => {
    checkStatus();
  }, []);

  if (!settings) return null;

  const handleUnlock = async () => {
    const res = await window.api.unlockVault(passphrase);
    if (res.ok) {
      setIsUnlocked(true);
      setPassphrase('');
    } else {
      setShowStatus('Failed to unlock: ' + res.error);
    }
  };

  const handleLock = async () => {
    await window.api.lockVault();
    setIsUnlocked(false);
  };

  const handleToggleDefault = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ encryptByDefault: e.target.checked });
  };

  const handleExport = async () => {
    await window.api.exportVault();
  };

  const handleImport = async () => {
    await window.api.importVault();
  };

  return (
    <div className={styles.section}>
      <h2>Encryption & Security</h2>
      <p className={styles.description}>
        Control how NoteVault manages your private data at rest.
      </p>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Vault Status</label>
          <span className={styles.description}>
            Your vault is currently {isUnlocked ? 'Unlocked' : 'Locked'}.
          </span>
        </div>
        {isUnlocked ? (
          <button className={styles.button} onClick={handleLock}>Lock Vault</button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="password" 
              className={styles.input} 
              placeholder="Passphrase" 
              value={passphrase} 
              onChange={(e) => setPassphrase(e.target.value)} 
            />
            <button className={styles.primaryButton} onClick={handleUnlock}>Unlock</button>
          </div>
        )}
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Encrypt by Default</label>
          <span className={styles.description}>All new tabs will be encrypted from the start.</span>
        </div>
        <input 
          type="checkbox" 
          checked={settings.encryptByDefault}
          onChange={handleToggleDefault}
          className={styles.checkbox}
        />
      </div>

      <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <label>Export/Import Backup</label>
            <span className={styles.description}>
              Save or restore your entire vault including all tabs.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className={styles.button} onClick={handleExport}>Export Backup (.nvault)</button>
            <button className={styles.button} onClick={handleImport}>Import Backup</button>
          </div>
      </div>
      
      {showStatus && <p className={styles.status}>{showStatus}</p>}
    </div>
  );
};
