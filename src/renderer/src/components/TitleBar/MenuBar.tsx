import React, { useState, useRef, useEffect } from "react";
import { useTabStore } from "../../store/tabs";
import { useUIStore } from "../../store/ui";
import styles from "./MenuBar.module.css";

interface MenuItem {
  label: string;
  items: Array<{
    label?: string; // Optional if divider
    shortcut?: string;
    action?: () => void;
    divider?: boolean;
    disabled?: boolean;
  }>;
}

export const MenuBar: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { addTab, setTabs } = useTabStore();
  const {
    setSettingsOpen,
    setSearchOpen,
    updateSettings,
    setArchiveOpen,
    setAboutOpen,
  } = useUIStore();

  const handleExportAll = async () => {
    const success = await window.api.exportAllZip();
    if (success) {
      // Optional: show a small success notification
    }
  };

  const handleImport = async (merge: boolean) => {
    const success = await window.api.importAll(merge);
    if (success) {
      const updatedTabs = await window.api.loadTabs();
      setTabs(updatedTabs);
    }
  };

  const handleClearAll = async () => {
    const success = await window.api.clearAllTabs();
    if (success) {
      setTabs([]);
      addTab(); // Ensure at least one tab exists
    }
  };

  const menus: MenuItem[] = [
    {
      label: "File",
      items: [
        { label: "New Tab", shortcut: "Ctrl+T", action: () => addTab() },
        { divider: true },
        { label: "Import... (Merge)", action: () => handleImport(true) },
        { label: "Import... (Replace)", action: () => handleImport(false) },
        {
          label: "Export All as Zip...",
          shortcut: "Ctrl+Shift+X",
          action: handleExportAll,
        },
        { divider: true },
        { label: "Exit", action: () => window.api.close() },
      ],
    },
    {
      label: "Edit",
      items: [
        { label: "Undo", shortcut: "Ctrl+Z", disabled: true },
        { label: "Redo", shortcut: "Ctrl+Y", disabled: true },
        { divider: true },
        { label: "Cut", shortcut: "Ctrl+X", disabled: true },
        { label: "Copy", shortcut: "Ctrl+C", disabled: true },
        { label: "Paste", shortcut: "Ctrl+V", disabled: true },
        { divider: true },
        { label: "Search in active tab", shortcut: "Ctrl+F", action: () => {} },
        {
          label: "Search in all tabs",
          shortcut: "Ctrl+Shift+F",
          action: () => setSearchOpen(true),
        },
      ],
    },
    {
      label: "View",
      items: [
        {
          label: "Theme: Light",
          action: () => updateSettings({ theme: "light" }),
        },
        {
          label: "Theme: Dark",
          action: () => updateSettings({ theme: "dark" }),
        },
        {
          label: "Theme: System",
          action: () => updateSettings({ theme: "system" }),
        },
        { divider: true },
        { label: "Show Archived Tabs", action: () => setArchiveOpen(true) },
        { divider: true },
        { label: "Clear all tabs data", action: handleClearAll },
      ],
    },
    {
      label: "Preferences",
      items: [
        {
          label: "Settings",
          shortcut: "Ctrl+,",
          action: () => setSettingsOpen(true),
        },
      ],
    },
    {
      label: "Help",
      items: [{ label: "About NoteVault", action: () => setAboutOpen(true) }],
    },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.menuBar} ref={menuRef}>
      {menus.map((menu) => (
        <div key={menu.label} className={styles.menuItem}>
          <div
            className={`${styles.menuItemLabel} ${activeMenu === menu.label ? styles.active : ""}`}
            onClick={() =>
              setActiveMenu(activeMenu === menu.label ? null : menu.label)
            }
            onMouseEnter={() => activeMenu && setActiveMenu(menu.label)}
          >
            {menu.label}
          </div>
          {activeMenu === menu.label && (
            <div className={styles.dropdown}>
              {menu.items.map((item, idx) =>
                item.divider ? (
                  <div key={idx} className={styles.divider} />
                ) : (
                  <div
                    key={item.label}
                    className={`${styles.dropdownItem} ${item.disabled ? styles.disabled : ""}`}
                    onClick={() => {
                      item.action?.();
                      setActiveMenu(null);
                    }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span className={styles.shortcut}>{item.shortcut}</span>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
