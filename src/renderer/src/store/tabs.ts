import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Tab, TabGroup, TabColor } from '../../../shared/types';

interface TabState {
  tabs: Tab[];
  groups: TabGroup[];
  activeTabId: string | null;
  cursorPosition: { lineNumber: number; column: number } | null;
  
  // Actions
  setCursorPosition: (pos: { lineNumber: number; column: number } | null) => void;
  addTab: (content?: string, label?: string, options?: { color?: TabColor; groupId?: string; language?: string }) => string;
  removeTab: (id: string | string[]) => void;
  restoreTab: (id: string) => void;
  setActiveTab: (id: string, notify?: boolean) => void;
  updateTab: (id: string, updates: Partial<Tab>, notifyIpc?: boolean) => void;
  reorderTabs: (newTabs: Tab[]) => void;
  setTabs: (tabs: Tab[]) => void;
  togglePin: (id: string) => void;
  toggleEncryption: (id: string) => Promise<void>;
  
  // Tab Groups
  setGroups: (groups: TabGroup[]) => void;
  addGroup: (label: string, color: TabColor) => string;
  removeGroup: (id: string) => void;
  updateGroup: (id: string, updates: Partial<TabGroup>) => void;
  setColor: (id: string, color: TabColor | undefined) => void;
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  groups: [],
  activeTabId: null,
  cursorPosition: null,

  setCursorPosition: (pos) => set({ cursorPosition: pos }),

  addTab: (content = '', label = 'New Tab', options = {}) => {
    const id = uuidv4();
    const newTab: Tab = {
      id,
      label,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
      order: get().tabs.length,
      encrypted: false,
      language: options.language || 'plaintext',
      color: options.color,
      groupId: options.groupId,
      archived: false
    };
    
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: id,
    }));
    
    window.api.saveTabs(get().tabs);
    return id;
  },

  removeTab: (id) => {
    const targetIds = Array.isArray(id) ? id : [id];
    
    set((state) => {
      const newTabs = state.tabs.map((t) => 
        (targetIds.includes(t.id) && !t.pinned) ? { ...t, archived: true } : t
      );
      
      const activeTabs = newTabs.filter(t => !t.archived);
      const newActiveId = targetIds.includes(state.activeTabId || '')
        ? (activeTabs[0]?.id || null) 
        : state.activeTabId;
        
      return { tabs: newTabs, activeTabId: newActiveId };
    });
    
    window.api.saveTabs(get().tabs);
  },

  restoreTab: (id) => {
    set((state) => {
      const newTabs = state.tabs.map(t => t.id === id ? { ...t, archived: false } : t);
      return { tabs: newTabs, activeTabId: id };
    });
    window.api.saveTabs(get().tabs);
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTab: (id, updates, notifyIpc = true) => {
    set((state) => {
      const index = state.tabs.findIndex((t) => t.id === id);
      if (index === -1) return state;
      
      const newTabs = [...state.tabs];
      newTabs[index] = { ...newTabs[index], ...updates, updatedAt: Date.now() };
      return { tabs: newTabs };
    });
    
    // IPC update
    if (notifyIpc) {
      window.api.updateTab(id, updates);
    }
  },

  reorderTabs: (newTabs) => {
    set({ tabs: newTabs });
    window.api.saveTabs(newTabs);
  },
  
  setTabs: (tabs) => {
    const activeTabs = tabs.filter(t => !t.archived);
    set({ tabs, activeTabId: get().activeTabId || activeTabs[0]?.id || null });
  },

  togglePin: (id) => {
    const tabs = get().tabs;
    const tab = tabs.find(t => t.id === id);
    if (!tab) return;
    
    const newTabs = tabs.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t);
    set({ tabs: newTabs });
    window.api.saveTabs(newTabs);
  },

  toggleEncryption: async (id) => {
    const tab = get().tabs.find(t => t.id === id);
    if (!tab) return;
    
    const newEncrypted = !tab.encrypted;
    const result = await window.api.setTabEncrypted(id, newEncrypted);
    
    if (result.ok) {
        set((state) => ({
            tabs: state.tabs.map(t => t.id === id ? { ...t, encrypted: newEncrypted } : t)
        }));
    } else {
        console.error('Failed to toggle encryption:', result.error);
        alert(`Failed to toggle encryption: ${result.error}`);
    }
  },

  setGroups: (groups) => set({ groups }),

  addGroup: (label, color) => {
    const id = uuidv4();
    const newGroup = { id, label, color, collapsed: false };
    set((state) => ({ groups: [...state.groups, newGroup] }));
    window.api.saveTabGroups(get().groups);
    return id;
  },

  removeGroup: (id) => {
    set((state) => ({ groups: state.groups.filter(g => g.id !== id) }));
    window.api.saveTabGroups(get().groups);
    // Unset groupId for tabs in this group
    const tabs = get().tabs.map(t => t.groupId === id ? { ...t, groupId: undefined } : t);
    set({ tabs });
    window.api.saveTabs(tabs);
  },

  updateGroup: (id, updates) => {
    set((state) => ({
      groups: state.groups.map(g => g.id === id ? { ...g, ...updates } : g)
    }));
    window.api.saveTabGroups(get().groups);
  },

  setColor: (id, color) => {
    get().updateTab(id, { color });
  }
}));
