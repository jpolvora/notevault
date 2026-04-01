import styles from "./AboutModal.module.css";
import { useUIStore } from "../../store/ui";

export const AboutModal = () => {
  const { isAboutOpen, setAboutOpen } = useUIStore();

  if (!isAboutOpen) return null;

  return (
    <div className={styles.overlay} onClick={() => setAboutOpen(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.logo}>⬡</span>
          <h2>About NoteVault</h2>
        </div>

        <div className={styles.content}>
          <p className={styles.version}>Version 1.1.0</p>
          <p className={styles.description}>
            A professional, high-performance, and secure notepad for developers.
            Featuring AES-256-GCM encryption and Fluent Design.
          </p>

          <div className={styles.credits}>
            <p>
              Created by <strong>Jone Polvora</strong>
            </p>
            <a
              href="https://github.com/jpolvora/notevault"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              github.com/jpolvora/notevault
            </a>
          </div>
        </div>

        <button className={styles.closeBtn} onClick={() => setAboutOpen(false)}>
          Close
        </button>
      </div>
    </div>
  );
};
