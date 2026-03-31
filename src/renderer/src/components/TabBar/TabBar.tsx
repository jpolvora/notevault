import { useMemo, useState } from 'react';
import { useTabStore } from '../../store/tabs';
import { useUIStore } from '../../store/ui';
import styles from './TabBar.module.css';
import { TabItem } from './TabItem';
import { ArchivePopup } from './ArchivePopup';
import { TabColor } from '../../../../shared/types';

export const TabBar = () => {
  const { tabs, activeTabId, addTab, setActiveTab, restoreTab } = useTabStore();
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const { settings } = useUIStore();
  const groupTabsByColor = settings?.groupTabsByColor || false;

  const groupedTabs = useMemo(() => {
    if (!groupTabsByColor) return tabs.map(t => ({ tab: t, showDivider: false }));
    
    const colors: (TabColor | undefined)[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray', undefined];
    const sorted = [...tabs].sort((a, b) => colors.indexOf(a.color) - colors.indexOf(b.color));
    
    return sorted.map((tab, i) => {
        const nextTab = sorted[i+1];
        const showDivider = nextTab && nextTab.color !== tab.color;
        return { tab, showDivider };
    });
  }, [tabs, groupTabsByColor]);

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
        {groupedTabs.filter(gt => !gt.tab.archived).map(({ tab, showDivider }) => (
          <div key={tab.id} style={{ display: 'flex', height: '100%', alignItems: 'center' }}>
            <TabItem
              tab={tab}
              isActive={tab.id === activeTabId}
              onClick={() => setActiveTab(tab.id)}
            />
            {showDivider && (
              <div 
                style={{ 
                  width: '1px', 
                  height: '60%', 
                  background: 'var(--color-border)', 
                  margin: '0 4px',
                  opacity: 0.5 
                }} 
              />
            )}
          </div>
        ))}
        <button className={styles.addBtn} onClick={() => addTab()} title="New Tab (Ctrl+T)">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6,0v12M0,6h12" stroke="currentColor" strokeWidth="1.5"/></svg>
        </button>
        <button className={styles.archiveBtn} onClick={() => setIsArchiveOpen(true)} title="Archived Tabs">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8H3V6h18v2zm-2 1h-14v11h14V9zm-3 2v2H8v-2h8z"/></svg>
        </button>
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
