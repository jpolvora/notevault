import React from "react";
import { useUIStore } from "../../../store/ui";
import styles from "../Settings.module.css";

export const AutoSaveSettings: React.FC = () => {
  const { settings, updateSettings } = useUIStore();

  if (!settings) return null;

  return (
    <div className={styles.section}>
      <h2>Auto-Save & Persistence</h2>
      <p className={styles.description}>
        Control how often NoteVault saves changes locally.
      </p>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Auto-Save Interval</label>
          <span className={styles.description}>
            How long to wait (in ms) after you stop typing before saving
            (default: 300).
          </span>
        </div>
        <select
          value={settings.autoSaveInterval}
          onChange={(e) =>
            updateSettings({ autoSaveInterval: parseInt(e.target.value) })
          }
          className={styles.select}
        >
          <option value="100">Almost Immediate (100ms)</option>
          <option value="300">Default (300ms)</option>
          <option value="1000">Patient (1s)</option>
          <option value="5000">Slow (5s)</option>
        </select>
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Session Restore</label>
          <span className={styles.description}>
            Always restore tabs and cursor position on startup.
          </span>
        </div>
        <input
          type="checkbox"
          checked={true} // Always on for now
          disabled
          className={styles.checkbox}
        />
      </div>
    </div>
  );
};
