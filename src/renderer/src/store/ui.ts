import { create } from "zustand";
import { UserSettings } from "../../../shared/types";

interface UIState {
  settings: UserSettings | null;
  isSettingsOpen: boolean;
  isCommandPaletteOpen: boolean;
  isLanguageSelectorOpen: boolean;
  isSearchOpen: boolean;
  isArchiveOpen: boolean;
  isAboutOpen: boolean;
  diffTabId: string | null;
  systemTheme: "light" | "dark";

  setSettings: (settings: UserSettings) => void;
  updateSettings: (updates: Partial<UserSettings>) => void;
  setSettingsOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setLanguageSelectorOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setArchiveOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  setDiffTabId: (id: string | null) => void;
  setSystemTheme: (theme: "light" | "dark") => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  settings: null,
  isSettingsOpen: false,
  isCommandPaletteOpen: false,
  isLanguageSelectorOpen: false,
  isSearchOpen: false,
  isArchiveOpen: false,
  isAboutOpen: false,
  diffTabId: null,
  systemTheme: "dark",

  setSettings: (settings) => set({ settings }),
  updateSettings: (updates) => {
    const current = get().settings;
    if (!current) return;

    const newSettings = { ...current, ...updates };
    set({ settings: newSettings });
    window.api.updateSettings(newSettings);
  },
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setLanguageSelectorOpen: (open) => set({ isLanguageSelectorOpen: open }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  setArchiveOpen: (open) => set({ isArchiveOpen: open }),
  setAboutOpen: (open) => set({ isAboutOpen: open }),
  setDiffTabId: (id) => set({ diffTabId: id }),
  setSystemTheme: (systemTheme) => set({ systemTheme }),
}));
