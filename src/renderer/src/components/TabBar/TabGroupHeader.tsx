import { useState, useRef, useEffect } from 'react';
import styles from './TabBar.module.css';
import { TabGroup } from '../../../../shared/types';
import { useTabStore } from '../../store/tabs';
import { ContextMenu } from '../ContextMenu/ContextMenu';

interface TabGroupHeaderProps {
  group: TabGroup;
}

export const TabGroupHeader = ({ group }: TabGroupHeaderProps) => {
  const { removeGroup, updateGroup } = useTabStore();
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempLabel, setTempLabel] = useState(group.label);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleBlur = () => {
    setIsRenaming(false);
    if (tempLabel.trim() && tempLabel !== group.label) {
      updateGroup(group.id, { label: tempLabel.trim() });
    } else {
      setTempLabel(group.label);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBlur();
    if (e.key === 'Escape') {
      setTempLabel(group.label);
      setIsRenaming(false);
    }
  };

  const menuOptions = [
    { label: 'Rename Group', onClick: () => setIsRenaming(true) },
    { label: 'Ungroup Tabs', onClick: () => removeGroup(group.id), divider: true },
    { label: 'Red', color: 'red', onClick: () => updateGroup(group.id, { color: 'red' }) },
    { label: 'Orange', color: 'orange', onClick: () => updateGroup(group.id, { color: 'orange' }) },
    { label: 'Yellow', color: 'yellow', onClick: () => updateGroup(group.id, { color: 'yellow' }) },
    { label: 'Green', color: 'green', onClick: () => updateGroup(group.id, { color: 'green' }) },
    { label: 'Blue', color: 'blue', onClick: () => updateGroup(group.id, { color: 'blue' }) },
    { label: 'Purple', color: 'purple', onClick: () => updateGroup(group.id, { color: 'purple' }) },
    { label: 'Gray', color: 'gray', onClick: () => updateGroup(group.id, { color: 'gray' }) },
  ];

  return (
    <>
      <div
        className={`${styles.groupHeader} ${group.collapsed ? styles.collapsed : ''}`}
        onClick={() => updateGroup(group.id, { collapsed: !group.collapsed })}
        onContextMenu={handleContextMenu}
        style={{ '--group-color': `var(--color-label-${group.color})` } as React.CSSProperties}
      >
        {isRenaming ? (
          <input
            ref={inputRef}
            className={styles.groupLabelInput}
            value={tempLabel}
            onChange={(e) => setTempLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={styles.groupLabel}>{group.label || 'Group'}</span>
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
