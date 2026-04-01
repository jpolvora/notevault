import { useState, useRef, useEffect } from "react";
import styles from "./TabBar.module.css";
import { Tab } from "../../../../shared/types";
import { useTabStore } from "../../store/tabs";
import { useUIStore } from "../../store/ui";
import { ContextMenu } from "../ContextMenu/ContextMenu";

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
}

export const TabItem = ({ tab, isActive, onClick }: TabItemProps) => {
  const {
    removeTab,
    discardTab,
    togglePin,
    updateTab,
    toggleEncryption,
    setColor,
  } = useTabStore();
  const { setDiffTabId, settings } = useUIStore();
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempLabel, setTempLabel] = useState(tab.label);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();

    const behavior = settings?.tabClosingBehavior || "archive";

    if (behavior === "discard") {
      const hasContent = tab.content.trim().length > 0;
      if (hasContent) {
        const confirmed = window.confirm(
          `Are you sure you want to discard "${tab.label}"? This action is irreversible and you will lose your data.`,
        );
        if (!confirmed) return;
      }
      discardTab(tab.id);
    } else {
      removeTab(tab.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDoubleClick = () => {
    setIsRenaming(true);
  };

  const handleBlur = () => {
    setIsRenaming(false);
    if (tempLabel.trim() && tempLabel !== tab.label) {
      updateTab(tab.id, { label: tempLabel.trim() });
    } else {
      setTempLabel(tab.label);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleBlur();
    if (e.key === "Escape") {
      setTempLabel(tab.label);
      setIsRenaming(false);
    }
  };

  const handleExport = async (format: "txt" | "md" | "json") => {
    const ok = await window.api.exportFile(tab.content, tab.label, format);
    if (ok) {
      console.log(`Tab exported as .${format}`);
    }
  };

  const menuOptions = [
    {
      label: tab.pinned ? "Unpin Tab" : "Pin Tab",
      onClick: () => togglePin(tab.id),
    },
    {
      label: tab.encrypted ? "Remove Encryption" : "Encrypt Tab",
      onClick: () => toggleEncryption(tab.id),
    },
    { label: "Rename Tab", onClick: () => setIsRenaming(true) },
    {
      label: "Show changes since last sync",
      onClick: () => setDiffTabId(tab.id),
      divider: true,
    },
    {
      label: "Export Tab...",
      onClick: () => {}, // Handled by sub-options later? No, let's keep it simple
      divider: true,
    },
    { label: "  as .txt", onClick: () => handleExport("txt") },
    { label: "  as .md", onClick: () => handleExport("md") },
    { label: "  as .json", onClick: () => handleExport("json") },
    { label: "Label Color", onClick: () => {}, divider: true },
    { label: "None", onClick: () => setColor(tab.id, undefined) },
    { label: "Red", color: "red", onClick: () => setColor(tab.id, "red") },
    {
      label: "Orange",
      color: "orange",
      onClick: () => setColor(tab.id, "orange"),
    },
    {
      label: "Yellow",
      color: "yellow",
      onClick: () => setColor(tab.id, "yellow"),
    },
    {
      label: "Green",
      color: "green",
      onClick: () => setColor(tab.id, "green"),
    },
    { label: "Blue", color: "blue", onClick: () => setColor(tab.id, "blue") },
    {
      label: "Purple",
      color: "purple",
      onClick: () => setColor(tab.id, "purple"),
    },
    { label: "Gray", color: "gray", onClick: () => setColor(tab.id, "gray") },
    { label: "Group", onClick: () => {}, divider: true },
    {
      label: "New Group",
      onClick: () => {
        const id = useTabStore.getState().addGroup("New Group", "blue");
        updateTab(tab.id, { groupId: id });
      },
    },
    ...useTabStore.getState().groups.map((g) => ({
      label: `Add to: ${g.label}`,
      onClick: () => updateTab(tab.id, { groupId: g.id }),
    })),
    ...(tab.groupId
      ? [
          {
            label: "Remove from group",
            onClick: () => updateTab(tab.id, { groupId: undefined }),
          },
        ]
      : []),
  ];

  return (
    <>
      <div
        className={`${styles.item} ${isActive ? styles.active : ""}`}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
        title={
          tab.encrypted
            ? "Encrypted (Right-click for options)"
            : "Click to select, right-click for options"
        }
      >
        <div className={styles.itemGroup}>
          {tab.color && (
            <div
              className={styles.colorDot}
              style={{ backgroundColor: `var(--color-label-${tab.color})` }}
            />
          )}
          {tab.pinned && <span className={styles.pinIcon}>📌</span>}
          {tab.encrypted && (
            <span className={styles.lockIcon} title="Encrypted Tab">
              🔒
            </span>
          )}
          {isRenaming ? (
            <input
              ref={inputRef}
              className={styles.labelInput}
              value={tempLabel}
              onChange={(e) => setTempLabel(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <span className={styles.label}>{tab.label}</span>
          )}
        </div>
        {!tab.pinned && (
          <button className={styles.closeBtn} onClick={handleClose}>
            <svg width="8" height="8" viewBox="0 1 10 10">
              <path
                d="M0,0l10,10M10,0L0,10"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          options={menuOptions}
        />
      )}
    </>
  );
};
