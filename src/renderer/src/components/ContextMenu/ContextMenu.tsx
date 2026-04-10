import { useEffect, useRef } from "react";
import styles from "./ContextMenu.module.css";

interface ContextMenuOption {
  label: string;
  icon?: string;
  onClick: () => void;
  color?: string;
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  options: ContextMenuOption[];
}

export const ContextMenu = ({ x, y, onClose, options }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Ensure menu stays within window bounds
  const adjustedX = Math.min(x, window.innerWidth - 160);
  const adjustedY = Math.min(
    y,
    window.innerHeight - (options.length * 32 + 20),
  );

  return (
    <div
      ref={menuRef}
      className={styles.menu}
      style={{ top: adjustedY, left: adjustedX }}
    >
      {options.map((option, index) => (
        <div key={index}>
          {option.divider && <div className={styles.divider} />}
          <div
            className={styles.option}
            onClick={() => {
              option.onClick();
              onClose();
            }}
          >
            {option.color && (
              <span
                className={styles.colorDot}
                style={{
                  backgroundColor: `var(--color-label-${option.color})`,
                }}
              />
            )}
            <span className={styles.label}>{option.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
