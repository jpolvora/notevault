import React from 'react';
import styles from './LanguageSelector.module.css';

interface Props {
  isOpen: boolean;
  activeLanguage: string;
  onSelect: (lang: string) => void;
  onClose: () => void;
}

const LANGUAGES = [
  'plaintext', 'markdown', 'json', 'javascript', 'typescript', 
  'python', 'sql', 'shell', 'xml', 'yaml', 'html', 'css'
];

export const LanguageSelector: React.FC<Props> = ({ isOpen, activeLanguage, onSelect, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>Select Language Mode</div>
        <div className={styles.list}>
          {LANGUAGES.map(lang => (
            <div 
              key={lang}
              className={`${styles.item} ${lang === activeLanguage ? styles.active : ''}`}
              onClick={() => {
                onSelect(lang);
                onClose();
              }}
            >
              {lang}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
