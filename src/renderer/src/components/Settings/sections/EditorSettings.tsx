import React from 'react';
import { useUIStore } from '../../../store/ui';
import styles from '../Settings.module.css';

export const EditorSettings: React.FC = () => {
  const { settings, updateSettings } = useUIStore();

  if (!settings) return null;

  return (
    <div className={styles.section}>
      <h2>Editor</h2>
      
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Font Family</label>
          <span className={styles.description}>The typeface used in the editor.</span>
        </div>
        <input 
          type="text" 
          value={settings.font.family}
          onChange={(e) => updateSettings({ font: { ...settings.font, family: e.target.value } })}
          className={styles.input}
        />
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Font Size</label>
          <span className={styles.description}>Adjust the text size for readability.</span>
        </div>
        <div className={styles.sliderContainer}>
          <input 
            type="range" 
            min="8" 
            max="32" 
            value={settings.fontSize}
            onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
          />
          <span>{settings.fontSize}px</span>
        </div>
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Word Wrap</label>
          <span className={styles.description}>Wrap long lines to fit the editor width.</span>
        </div>
        <input 
          type="checkbox" 
          checked={settings.wordWrap}
          onChange={(e) => updateSettings({ wordWrap: e.target.checked })}
          className={styles.checkbox}
        />
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Line Numbers</label>
          <span className={styles.description}>Show line numbers in the gutter.</span>
        </div>
        <select 
          value={settings.lineNumbers}
          onChange={(e) => updateSettings({ lineNumbers: e.target.value as any })}
          className={styles.select}
        >
          <option value="off">Off</option>
          <option value="on">On</option>
          <option value="relative">Relative</option>
        </select>
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label>Tab Size</label>
          <span className={styles.description}>Number of spaces for a tab character.</span>
        </div>
        <select 
          value={settings.tabSize}
          onChange={(e) => updateSettings({ tabSize: parseInt(e.target.value) as any })}
          className={styles.select}
        >
          <option value="2">2</option>
          <option value="4">4</option>
        </select>
      </div>
    </div>
  );
};
