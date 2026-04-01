import styles from "./TabBar.module.css";
import { Tab } from "../../../../shared/types";

interface ArchivePopupProps {
  tabs: Tab[];
  onClose: () => void;
  onRestore: (id: string) => void;
}

export const ArchivePopup = ({
  tabs,
  onClose,
  onRestore,
}: ArchivePopupProps) => {
  return (
    <div className={styles.popupOverlay} onClick={onClose}>
      <div
        className={styles.popupContainer}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.popupHeader}>
          <h3>Archived Tabs</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className={styles.popupList}>
          {tabs.length === 0 ? (
            <div className={styles.noItems}>No archived tabs.</div>
          ) : (
            tabs.map((tab) => (
              <div key={tab.id} className={styles.popupItem}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemLabel}>{tab.label}</span>
                  <span className={styles.itemDate}>
                    Closed {new Date(tab.updatedAt).toLocaleString()}
                  </span>
                </div>
                <button
                  className={styles.restoreBtn}
                  onClick={() => onRestore(tab.id)}
                >
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
