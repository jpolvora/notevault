import React, { useState } from 'react';
import styles from './Settings.module.css';
import { EditorSettings } from './sections/EditorSettings';
import { AppearanceSettings } from './sections/AppearanceSettings';
import { AutoSaveSettings } from './sections/AutoSaveSettings';
import { EncryptionSettings } from './sections/EncryptionSettings';
import { SyncSettings } from './sections/SyncSettings';
import { StartupSettings } from './sections/StartupSettings';
import { ShortcutsSettings } from './sections/ShortcutsSettings';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type SectionId = 'editor' | 'appearance' | 'auto-save' | 'encryption' | 'sync' | 'startup' | 'shortcuts';

export const Settings: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<SectionId>('editor');

  if (!isOpen) return null;

  const renderSection = () => {
    switch (activeSection) {
      case 'editor': return <EditorSettings />;
      case 'appearance': return <AppearanceSettings />;
      case 'auto-save': return <AutoSaveSettings />;
      case 'encryption': return <EncryptionSettings />;
      case 'sync': return <SyncSettings />;
      case 'startup': return <StartupSettings />;
      case 'shortcuts': return <ShortcutsSettings />;
      default: return <EditorSettings />;
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={e => e.stopPropagation()}>
        <div className={styles.sidebar}>
          <h3>Settings</h3>
          <nav>
            <button className={activeSection === 'editor' ? styles.active : ''} onClick={() => setActiveSection('editor')}>Editor</button>
            <button className={activeSection === 'appearance' ? styles.active : ''} onClick={() => setActiveSection('appearance')}>Appearance</button>
            <button className={activeSection === 'auto-save' ? styles.active : ''} onClick={() => setActiveSection('auto-save')}>Auto-Save</button>
            <button className={activeSection === 'encryption' ? styles.active : ''} onClick={() => setActiveSection('encryption')}>Encryption</button>
            <button className={activeSection === 'sync' ? styles.active : ''} onClick={() => setActiveSection('sync')}>Sync</button>
            <button className={activeSection === 'startup' ? styles.active : ''} onClick={() => setActiveSection('startup')}>Startup</button>
            <button className={activeSection === 'shortcuts' ? styles.active : ''} onClick={() => setActiveSection('shortcuts')}>Shortcuts</button>
          </nav>
        </div>
        <div className={styles.content}>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
          {renderSection()}
        </div>
      </div>
    </div>
  );
};

export default Settings;
