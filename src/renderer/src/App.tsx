import { useEffect, useState } from 'react';
import { TitleBar } from './components/TitleBar/TitleBar';
import { TabBar } from './components/TabBar/TabBar';
import { EditorPane } from './components/Editor/EditorPane';
import { StatusBar } from './components/StatusBar/StatusBar';
import UnlockScreen from './components/UnlockScreen/UnlockScreen';
import { defineMonacoThemes } from './components/Editor/monacoThemes';
import { Settings } from './components/Settings/Settings';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { SearchPanel } from './components/SearchPanel/SearchPanel';
import { useTabStore } from './store/tabs';
import { useUIStore } from './store/ui';

export const App = () => {
  const { setTabs, addTab, setActiveTab, tabs, activeTabId, removeTab, setGroups } = useTabStore();
  const { 
    setSettings, 
    settings, 
    isSettingsOpen, 
    setSettingsOpen, 
    isCommandPaletteOpen, 
    setCommandPaletteOpen,
    isSearchOpen,
    setSearchOpen,
    systemTheme,
    setSystemTheme 
  } = useUIStore();
  const [needsUnlock, setNeedsUnlock] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const loadData = async () => {
    const unlockRequired = await window.api.getNeedsUnlock();
    setNeedsUnlock(unlockRequired);

    const savedSettings = await window.api.loadSettings();
    setSettings(savedSettings);

    const savedGroups = await window.api.loadTabGroups();
    setGroups(savedGroups);

    if (!unlockRequired) {
      const savedTabs = await window.api.loadTabs();
      setTabs(savedTabs);
      if (savedTabs.length === 0) addTab();
    }
    
    setIsLoaded(true);
  };

  useEffect(() => {
    loadData();
    defineMonacoThemes();

    const offTabCreate = window.api.onTabCreate(() => {
      addTab();
    });
    const offTabFocus = window.api.onTabFocus((id) => setActiveTab(id));
    const offSettingsSync = window.api.onSettingsSync((s) => setSettings(s));
    const offThemeChanged = window.api.onThemeChanged((theme) => {
      setSystemTheme(theme);
    });

    return () => {
      offTabCreate();
      offTabFocus();
      offSettingsSync();
      offThemeChanged();
    };
  }, []);

  const handleUnlocked = async () => {
    setNeedsUnlock(false);
    const savedTabs = await window.api.loadTabs();
    setTabs(savedTabs);
    if (savedTabs.length === 0) addTab();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { ctrlKey, shiftKey, key } = e;

      if (ctrlKey && key === 't') {
        e.preventDefault();
        addTab();
      } else if (ctrlKey && key === 'w') {
        e.preventDefault();
        if (activeTabId) removeTab(activeTabId);
      } else if (ctrlKey && key === 'Tab') {
        e.preventDefault();
        if (tabs.length > 1) {
          const currentIndex = tabs.findIndex(t => t.id === activeTabId);
          const nextIndex = shiftKey 
            ? (currentIndex - 1 + tabs.length) % tabs.length
            : (currentIndex + 1) % tabs.length;
          setActiveTab(tabs[nextIndex].id);
        }
      } else if (ctrlKey && key === 'p') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      } else if (ctrlKey && key === ',') {
        e.preventDefault();
      } else if (ctrlKey && /^[1-9]$/.test(key)) {
        const index = parseInt(key) - 1;
        if (tabs[index]) {
          e.preventDefault();
          setActiveTab(tabs[index].id);
        }
      } else if (ctrlKey && shiftKey && key === 'F') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addTab, setActiveTab, removeTab, tabs, activeTabId]);

  if (!isLoaded) return null;

  const theme = settings?.theme === 'system' ? systemTheme : (settings?.theme || 'dark');

  return (
    <div 
      className="mica-effect" 
      data-theme={theme}
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}
    >
      <TitleBar />
      {needsUnlock ? (
        <UnlockScreen onUnlocked={handleUnlocked} />
      ) : (
        <>
          <TabBar />
          <EditorPane />
          <StatusBar />
          <CommandPalette 
            isOpen={isCommandPaletteOpen} 
            onClose={() => setCommandPaletteOpen(false)} 
          />
          <Settings 
            isOpen={isSettingsOpen} 
            onClose={() => setSettingsOpen(false)} 
          />
          <SearchPanel
            isOpen={isSearchOpen}
            onClose={() => setSearchOpen(false)}
          />
        </>
      )}
    </div>
  );
};

export default App;
