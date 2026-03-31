import React from 'react';
import { useUIStore } from '../../../store/ui';
import styles from '../Settings.module.css';

export const StartupSettings: React.FC = () => {
  const { settings, updateSettings } = useUIStore();

  if (!settings) return null;

  return (
    <div className={styles.section}>
      <h2>App Behavior & Startup</h2>
      <p className={styles.description}>
        Choose how NoteVault interacts with your system at launch.
      </p>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Start Minimized</label>
          <span className={styles.description}>Launch NoteVault silently in the system tray.</span>
        </div>
        <input 
          type="checkbox" 
          checked={settings.startMinimized}
          onChange={(e) => updateSettings({ startMinimized: e.target.checked })}
          className={styles.checkbox}
        />
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Close to Tray</label>
          <span className={styles.description}>Keep NoteVault running in the background when the window is closed.</span>
        </div>
        <input 
          type="checkbox" 
          checked={settings.closeToTray}
          onChange={(e) => updateSettings({ closeToTray: e.target.checked })}
          className={styles.checkbox}
        />
      </div>
    </div>
  );
};
