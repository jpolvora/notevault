import styles from "./StatusBar.module.css";
import { useTabStore } from "../../store/tabs";
import { useUIStore } from "../../store/ui";
import { AccountButton } from "../AccountButton/AccountButton";
import { LanguageSelector } from "../LanguageSelector/LanguageSelector";

export const StatusBar = () => {
  const { tabs, activeTabId, cursorPosition, updateTab } = useTabStore();
  const {
    isLanguageSelectorOpen: isLangOpen,
    setLanguageSelectorOpen: setIsLangOpen,
  } = useUIStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className={styles.container}>
      <div className={styles.left}>
        {activeTab ? (
          <>
            <span className={styles.item}>UTF-8</span>
            {activeTab.encrypted && (
              <span
                className={styles.item}
                title="This tab is encrypted at rest"
              >
                🔒
              </span>
            )}
            {cursorPosition && (
              <span className={styles.item}>
                Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
              </span>
            )}
          </>
        ) : (
          <span className={styles.item}>Ready</span>
        )}
      </div>
      <div className={styles.right}>
        {activeTab && (
          <>
            <button
              className={styles.actionBtn}
              onClick={() =>
                (window as any).api.setTabEncrypted(
                  activeTab.id,
                  !activeTab.encrypted,
                )
              }
              title={activeTab.encrypted ? "Remove encryption" : "Encrypt tab"}
            >
              {activeTab.encrypted ? "🔓 Decrypt" : "🔒 Encrypt"}
            </button>
            <button
              className={styles.item}
              onClick={() => setIsLangOpen(true)}
              style={{
                cursor: "pointer",
                border: "none",
                background: "transparent",
                padding: "0 8px",
              }}
            >
              {activeTab.language || "plaintext"}
            </button>
            <button
              className={styles.item}
              onClick={() =>
                window.dispatchEvent(new CustomEvent("monaco:format"))
              }
              title="Auto-format document"
              style={{
                cursor: "pointer",
                border: "none",
                background: "transparent",
                padding: "0 8px",
              }}
            >
              Format
            </button>
            <LanguageSelector
              isOpen={isLangOpen}
              activeLanguage={activeTab.language}
              onSelect={(lang) => updateTab(activeTab.id, { language: lang })}
              onClose={() => setIsLangOpen(false)}
            />
            <div className={styles.divider} />
          </>
        )}
        <AccountButton />
      </div>
    </div>
  );
};
