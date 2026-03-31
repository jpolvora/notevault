import React from 'react';
import { useUIStore } from '../../../store/ui';
import styles from '../Settings.module.css';

export const AppearanceSettings: React.FC = () => {
  const { settings, updateSettings } = useUIStore();

  if (!settings) return null;

  return (
    <div className={styles.section}>
      <h2>Appearance</h2>
      
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Theme</label>
          <span className={styles.description}>Choose between light, dark, or system-matching theme.</span>
        </div>
        <div className={styles.segmentedControl}>
          {(['system', 'light', 'dark'] as const).map(t => (
            <button 
              key={t}
              className={settings.theme === t ? styles.active : ''}
              onClick={() => updateSettings({ theme: t })}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Compact Tab Bar</label>
          <span className={styles.description}>Reduce the height of the tab bar for more vertical space.</span>
        </div>
        <input 
          type="checkbox" 
          checked={settings.compactTabBar}
          onChange={(e) => updateSettings({ compactTabBar: e.target.checked })}
          className={styles.checkbox}
        />
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Group Tabs by Color</label>
          <span className={styles.description}>Cluster tabs with colors together and add dividers.</span>
        </div>
        <input 
          type="checkbox" 
          checked={settings.groupTabsByColor}
          onChange={(e) => updateSettings({ groupTabsByColor: e.target.checked })}
          className={styles.checkbox}
        />
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Editor Font Family</label>
          <span className={styles.description}>Recommended: Monospaced fonts for better code legibility.</span>
        </div>
        <select 
          value={settings.editorFontFamily}
          onChange={(e) => updateSettings({ editorFontFamily: e.target.value })}
          className={styles.select}
        >
          <option value="'Cascadia Mono', Consolas, monospace">Cascadia Mono</option>
          <option value="'Fira Code', monospace">Fira Code</option>
          <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
          <option value="'Source Code Pro', monospace">Source Code Pro</option>
          <option value="'Courier New', Courier, monospace">Courier New</option>
          <option value="monospace">System Monospace</option>
        </select>
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Font Size</label>
          <span className={styles.description}>Adjust the editor text size (default: 14).</span>
        </div>
        <input 
          type="number" 
          min="8" 
          max="72"
          value={settings.editorFontSize}
          onChange={(e) => updateSettings({ editorFontSize: parseInt(e.target.value) })}
          className={styles.numberInput}
        />
      </div>
    </div>
  );
};
