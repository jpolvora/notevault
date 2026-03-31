import { useTabStore } from '../../store/tabs';
import { useUIStore } from '../../store/ui';

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon?: string;
  category: 'Commands' | 'Tabs' | 'Recent';
  action: () => void;
}

export const useCommandRegistry = () => {
  const { addTab, removeTab, activeTabId, togglePin, toggleEncryption, tabs, setActiveTab } = useTabStore();
  const { updateSettings, settings, setSettingsOpen } = useUIStore();

  const commands: Command[] = [
    { 
      id: 'tab.new', 
      label: 'New Tab', 
      shortcut: 'Ctrl+T', 
      category: 'Commands', 
      action: () => addTab() 
    },
    { 
      id: 'tab.close', 
      label: 'Close Tab', 
      shortcut: 'Ctrl+W', 
      category: 'Commands', 
      action: () => { if (activeTabId) removeTab(activeTabId); } 
    },
    { 
      id: 'tab.pin', 
      label: 'Pin / Unpin Tab', 
      shortcut: 'Ctrl+Shift+P', 
      category: 'Commands', 
      action: () => { if (activeTabId) togglePin(activeTabId); } 
    },
    { 
      id: 'tab.encrypt', 
      label: 'Toggle Encryption', 
      shortcut: 'Ctrl+Shift+E', 
      category: 'Commands', 
      action: () => { if (activeTabId) toggleEncryption(activeTabId); } 
    },
    { 
      id: 'sync.now', 
      label: 'Sync Now', 
      shortcut: 'Ctrl+Shift+S', 
      category: 'Commands', 
      action: () => window.api.syncNow() 
    },
    { 
      id: 'app.settings', 
      label: 'Settings', 
      shortcut: 'Ctrl+,', 
      category: 'Commands', 
      action: () => setSettingsOpen(true) 
    },
    { 
      id: 'editor.wrap', 
      label: `Toggle Word Wrap (${settings?.wordWrap ? 'On' : 'Off'})`, 
      category: 'Commands', 
      action: () => updateSettings({ wordWrap: !settings?.wordWrap }) 
    },
    { 
      id: 'editor.nums', 
      label: `Toggle Line Numbers (${settings?.lineNumbers !== 'off' ? 'On' : 'Off'})`, 
      category: 'Commands', 
      action: () => updateSettings({ lineNumbers: settings?.lineNumbers === 'off' ? 'on' : 'off' }) 
    },
    { 
      id: 'editor.lang', 
      label: 'Set Language Mode...', 
      category: 'Commands', 
      action: () => {
        useUIStore.getState().setLanguageSelectorOpen(true);
      } 
    },
  ];

  const tabCommands: Command[] = tabs.map(tab => ({
    id: `goto.tab.${tab.id}`,
    label: tab.label || 'Untitled Tab',
    category: 'Tabs',
    icon: tab.encrypted ? '🔒' : '📄',
    action: () => setActiveTab(tab.id)
  }));

  return [...commands, ...tabCommands];
};
