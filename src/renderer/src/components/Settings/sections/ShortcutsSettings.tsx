import React from "react";
import { useUIStore } from "../../../store/ui";
import styles from "../Settings.module.css";

export const ShortcutsSettings: React.FC = () => {
  const { settings, updateSettings } = useUIStore();

  if (!settings) return null;

  return (
    <div className={styles.section}>
      <h2>Global & Global Shortcuts</h2>
      <p className={styles.description}>
        Set system-wide hotkeys to instantly show or hide NoteVault.
      </p>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Global Show/Hide</label>
          <span className={styles.description}>
            Hotkey to toggle NoteVault window from anywhere (default:
            Ctrl+Shift+N).
          </span>
        </div>
        <input
          type="text"
          value={settings.globalShortcut}
          onChange={(e) => updateSettings({ globalShortcut: e.target.value })}
          className={styles.input}
          placeholder="Ctrl+Shift+N"
        />
      </div>

      <div className={styles.shortcutsTable}>
        <h3>In-Editor Shortcuts</h3>
        <div className={styles.shortcutItem}>
          <span>New Tab</span>
          <kbd>Ctrl+T</kbd>
        </div>
        <div className={styles.shortcutItem}>
          <span>Close Tab</span>
          <kbd>Ctrl+W</kbd>
        </div>
        <div className={styles.shortcutItem}>
          <span>Switch Tabs</span>
          <kbd>Ctrl+Tab</kbd>
        </div>
        <div className={styles.shortcutItem}>
          <span>Global Search</span>
          <kbd>Ctrl+Shift+F</kbd>
        </div>
        <div className={styles.shortcutItem}>
          <span>Command Palette</span>
          <kbd>Ctrl+P</kbd>
        </div>
        <div className={styles.shortcutItem}>
          <span>Archive Recovery</span>
          <kbd>Ctrl+Shift+A</kbd>
        </div>
      </div>
    </div>
  );
};
