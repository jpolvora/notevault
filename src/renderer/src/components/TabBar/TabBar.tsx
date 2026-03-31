import { useMemo, useState } from 'react';
import { useTabStore } from '../../store/tabs';
import { useUIStore } from '../../store/ui';
import styles from './TabBar.module.css';
import { TabItem } from './TabItem';
import { TabGroupHeader } from './TabGroupHeader';
import { ArchivePopup } from './ArchivePopup';
import { Tab, TabGroup } from '../../../../shared/types';

export const TabBar = () => {
  const { tabs, groups, activeTabId, addTab, setActiveTab, restoreTab } = useTabStore();
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const { settings } = useUIStore();
  const groupTabsByColor = settings?.groupTabsByColor || false;

  const displayElements = useMemo(() => {
    const activeTabs = tabs.filter(t => !t.archived);
    const elements: ( { type: 'tab', tab: Tab } | { type: 'group', group: TabGroup } | { type: 'divider' })[] = [];
    
    // 1. If we are using the new TabGroups
    if (groups.length > 0) {
      // First, handle tabs WITHOUT a group
      const ungroupedTabs = activeTabs.filter(t => !t.groupId);
      ungroupedTabs.forEach(tab => {
        elements.push({ type: 'tab', tab });
      });

      // Then, handle each group
      groups.forEach(group => {
        elements.push({ type: 'group', group });
        
        if (!group.collapsed) {
          const groupTabs = activeTabs.filter(t => t.groupId === group.id);
          groupTabs.forEach(tab => {
            elements.push({ type: 'tab', tab });
          });
        }
      });

      return elements;
    }

    // 2. Fallback to group by color (Legacy logic)
    if (groupTabsByColor) {
      const colors: (string | undefined)[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray', undefined];
      const sorted = [...activeTabs].sort((a, b) => colors.indexOf(a.color || '') - colors.indexOf(b.color || ''));
      
      sorted.forEach((tab, i) => {
        elements.push({ type: 'tab', tab });
        const nextTab = sorted[i+1];
        if (nextTab && nextTab.color !== tab.color) {
          elements.push({ type: 'divider' });
        }
      });
      return elements;
    }

    // 3. Simple list
    return activeTabs.map(t => ({ type: 'tab', tab: t }));
  }, [tabs, groups, groupTabsByColor]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    
    for (const file of files) {
      const result = await window.api.importFile((file as any).path);
      if (result) {
        addTab(result.content, result.label, { language: result.language });
      }
    }
  };

  return (
    <div className={styles.container}>
      <div 
        className={styles.scrollArea}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {displayElements.map((el, i) => {
          if (el.type === 'group') {
            return <TabGroupHeader key={el.group.id} group={el.group} />;
          }
          if (el.type === 'divider') {
            return (
              <div 
                key={`divider-${i}`}
                style={{ 
                  width: '1px', 
                  height: '60%', 
                  background: 'var(--color-border)', 
                  margin: '0 4px',
                  opacity: 0.5 
                }} 
              />
            );
          }
          const { tab } = el;
          return (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onClick={() => setActiveTab(tab.id)}
            />
          );
        })}
        <div className={styles.actionsBox}>
          <button className={styles.addBtn} onClick={() => addTab()} title="New Tab (Ctrl+T)">
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6,0v12M0,6h12" stroke="currentColor" strokeWidth="1.5"/></svg>
          </button>
          <button className={styles.archiveBtn} onClick={() => setIsArchiveOpen(true)} title="Archived Tabs">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8H3V6h18v2zm-2 1h-14v11h14V9zm-3 2v2H8v-2h8z"/></svg>
          </button>
        </div>
      </div>

      {isArchiveOpen && (
        <ArchivePopup 
          tabs={tabs.filter(t => t.archived)} 
          onClose={() => setIsArchiveOpen(false)} 
          onRestore={(id) => {
            restoreTab(id);
            setIsArchiveOpen(false);
          }}
        />
      )}
    </div>
  );
};

