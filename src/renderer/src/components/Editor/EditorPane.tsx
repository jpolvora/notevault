import { DiffEditor } from "@monaco-editor/react";
import { useTabStore } from "../../store/tabs";
import { useUIStore } from "../../store/ui";
import { MonacoInstance } from "./MonacoInstance";

export const EditorPane = () => {
  const { tabs, activeTabId } = useTabStore();
  const { diffTabId, setDiffTabId, settings, systemTheme } = useUIStore();

  const theme =
    settings?.theme === "system" ? systemTheme : settings?.theme || "dark";

  return (
    <div
      style={{ flex: 1, position: "relative", width: "100%", height: "100%" }}
    >
      {tabs.length === 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "var(--color-text-muted)",
            fontSize: "14px",
          }}
        >
          No active tabs. Press Ctrl+T to create a new one.
        </div>
      ) : (
        tabs.map((tab) => (
          <div
            key={tab.id}
            style={{
              display: tab.id === activeTabId ? "flex" : "none",
              height: "100%",
              width: "100%",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            {diffTabId === tab.id ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                  height: "100%",
                  background: "var(--color-bg)",
                }}
              >
                <div
                  style={{
                    padding: "8px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Comparing local with last synced version
                  </span>
                  <button
                    onClick={() => setDiffTabId(null)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      background: "var(--color-surface-hover)",
                      fontSize: "11px",
                    }}
                  >
                    Close Diff
                  </button>
                </div>
                <div style={{ flex: 1 }}>
                  <DiffEditor
                    original={tab.lastSyncedContent || ""}
                    modified={tab.content}
                    language={tab.language}
                    theme={theme === "light" ? "vs" : "vs-dark"}
                    options={{
                      renderSideBySide: true,
                      readOnly: true,
                      minimap: { enabled: false },
                    }}
                  />
                </div>
              </div>
            ) : (
              <MonacoInstance tab={tab} isActive={tab.id === activeTabId} />
            )}
          </div>
        ))
      )}
    </div>
  );
};
