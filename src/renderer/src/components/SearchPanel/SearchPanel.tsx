import { useState, useMemo } from 'react';
import styles from './SearchPanel.module.css';
import { useTabStore } from '../../store/tabs';

interface SearchResult {
  tabId: string;
  tabLabel: string;
  lineNumber: number;
  text: string;
  matchIndex: number;
  matchLength: number;
}

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchPanel = ({ isOpen, onClose }: SearchPanelProps) => {
  const { tabs, setActiveTab } = useTabStore();
  const [query, setQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];

    const allResults: SearchResult[] = [];
    
    // Simple implementation: search through tab.content
    // For encrypted tabs that are locked, content will be redacted (''), 
    // so they won't show results unless unlocked.
    
    tabs.forEach(tab => {
      if (!tab.content) return;
      
      const lines = tab.content.split('\n');
      lines.forEach((line, index) => {
        const q = matchCase ? query : query.toLowerCase();
        const l = matchCase ? line : line.toLowerCase();
        
        if (useRegex) {
            try {
                const regex = new RegExp(query, matchCase ? 'g' : 'gi');
                let m;
                while ((m = regex.exec(line)) !== null) {
                    allResults.push({
                        tabId: tab.id,
                        tabLabel: tab.label,
                        lineNumber: index + 1,
                        text: line,
                        matchIndex: m.index,
                        matchLength: m[0].length
                    });
                }
            } catch (e) { /* Invalid regex */ }
        } else if (l.includes(q)) {
          // Find all occurrences in the line
          let pos = l.indexOf(q);
          while (pos !== -1) {
            allResults.push({
              tabId: tab.id,
              tabLabel: tab.label,
              lineNumber: index + 1,
              text: line,
              matchIndex: pos,
              matchLength: query.length
            });
            pos = l.indexOf(q, pos + 1);
          }
        }
      });
    });

    return allResults;
  }, [tabs, query, matchCase, useRegex]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.searchBox}>
            <input
              autoFocus
              className={styles.input}
              placeholder="Search all tabs..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && onClose()}
            />
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
          <div className={styles.options}>
            <label className={styles.option}>
              <input type="checkbox" checked={matchCase} onChange={e => setMatchCase(e.target.checked)} />
              Match Case
            </label>
            <label className={styles.option}>
              <input type="checkbox" checked={useRegex} onChange={e => setUseRegex(e.target.checked)} />
              Regex
            </label>
          </div>
        </div>

        <div className={styles.resultsList}>
          {results.length > 0 ? (
            results.map((result, i) => (
              <div 
                key={i} 
                className={styles.resultItem}
                onClick={() => {
                  setActiveTab(result.tabId);
                  // We would also want to reveal the line, but we need 
                  // to communicate this to the Editor component.
                  // For now, focusing the tab is a good start.
                  onClose();
                }}
              >
                <div className={styles.resultHeader}>
                  <span className={styles.tabLabel}>{result.tabLabel}</span>
                  <span className={styles.lineNumber}>Ln {result.lineNumber}</span>
                </div>
                <div className={styles.resultText}>
                  {result.text.substring(0, result.matchIndex)}
                  <mark className={styles.highlight}>
                    {result.text.substring(result.matchIndex, result.matchIndex + result.matchLength)}
                  </mark>
                  {result.text.substring(result.matchIndex + result.matchLength)}
                </div>
              </div>
            ))
          ) : query.length >= 2 ? (
            <div className={styles.noResults}>No matches found.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
