import { useState } from 'react';
import styles from './TitleBar.module.css';

export const TitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = () => window.api.minimize();
  const handleMaximize = () => {
    window.api.maximize();
    setIsMaximized(!isMaximized);
  };
  const handleClose = () => window.api.close();

  return (
    <div className={styles.container}>
      <div className={styles.dragRegion}>
        <div className={styles.logo}>⬡</div>
        <div className={styles.title}>NoteVault</div>
      </div>
      <div className={styles.controls}>
        <button onClick={handleMinimize} title="Minimize" className={styles.controlBtn}>
          <svg width="10" height="2" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
        </button>
        <button onClick={handleMaximize} title="Maximize" className={styles.controlBtn}>
           {isMaximized ? (
             <svg width="10" height="10" viewBox="0 1 10 10">
               <path d="M2,2 L2,4 L0,4 L0,10 L6,10 L6,8 L8,8 L8,2 L2,2 Z M5,9 L1,9 L1,5 L5,5 L5,9 Z M7,7 L6,7 L6,5 L5,5 L5,4 L2,4 L2,3 L7,3 L7,7 Z" fill="currentColor"/>
             </svg>
           ) : (
             <svg width="10" height="10" viewBox="0 0 10 10">
               <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1"/>
             </svg>
           )}
        </button>
        <button onClick={handleClose} title="Close" className={`${styles.controlBtn} ${styles.closeBtn}`}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1" />
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </div>
  );
};
