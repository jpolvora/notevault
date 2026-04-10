import React from "react";
import { useUIStore } from "../../../store/ui";

export const BehaviorSettings: React.FC = () => {
  const { settings, updateSettings } = useUIStore();

  if (!settings) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "10px" }}>
        Behavior Settings
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "13px", fontWeight: 500 }}>
            Tab Closing Behavior
          </span>
          <select
            style={{
              padding: "6px",
              borderRadius: "4px",
              background: "var(--color-surface)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
              fontSize: "13px",
            }}
            value={settings.tabClosingBehavior || "archive"}
            onChange={(e) =>
              updateSettings({
                tabClosingBehavior: e.target.value as "archive" | "discard",
              })
            }
          >
            <option value="archive">
              Archive (Safe, can be restored later)
            </option>
            <option value="discard">
              Discard (Irreversible, asks for confirmation)
            </option>
          </select>
          <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
            Choose whether closing a tab moves it to archive or removes it
            permanently.
          </span>
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginTop: "10px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={settings.closeToTray}
            onChange={(e) => updateSettings({ closeToTray: e.target.checked })}
          />
          <span style={{ fontSize: "13px" }}>
            Close application to system tray
          </span>
        </label>
      </div>
    </div>
  );
};
