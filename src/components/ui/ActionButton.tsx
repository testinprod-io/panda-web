import React, { useRef, useState, useEffect } from "react";
import clsx from "clsx";
import styles from "./actionButton.module.scss";

export interface ActionButtonProps {
  text?: string | null; // Text is now optional
  icon: React.ReactElement;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
  disabled?: boolean;
  title?: string; // Added for accessibility and tooltips
  ariaLabel?: string; // For more specific accessibility labeling
}

export function ActionButton(props: ActionButtonProps) {
  const {
    text,
    icon,
    onClick,
    className,
    disabled,
    title,
    ariaLabel,
  } = props;

  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState({
    full: 0,
    icon: 0,
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Initial width calculation
    updateWidth();
  }, []);

  // Recalculate width if text content changes and component is mounted
  useEffect(() => {
    if (isMounted) {
      updateWidth();
    }
  }, [text, isMounted]);

  function updateWidth() {
    if (!iconRef.current) return;
    const iconW = iconRef.current.getBoundingClientRect().width;
    let textW = 0;
    if (textRef.current && text) {
      textW = textRef.current.getBoundingClientRect().width;
    }
    setWidth({
      full: textW + iconW + (text ? 8 : 0), // Add padding if text exists
      icon: iconW,
    });
  }

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !onClick) return;
    onClick(event);
    // Optionally, you might want to call updateWidth if the click could change text or visibility
    // However, the primary animation is CSS-driven on hover/focus, so it might not be needed here.
  };

  return (
    <div
      className={clsx(
        styles.actionButton,
        "clickable", // Kept for potential global styles or compatibility
        className,
      )}
      onClick={handleClick}
      onMouseEnter={isMounted && text ? updateWidth : undefined}
      onTouchStart={isMounted && text ? updateWidth : undefined} // For touch devices to trigger width calc before text appears
      style={{
        ["--icon-width" as string]: `${width.icon}px`,
        ["--full-width" as string]: `${width.full}px`,
        // Set a fixed width when text is not present or component is not mounted yet for hover animations
        // or when text is present, allow CSS to control width based on --full-width
        width: !isMounted || !text ? `${width.icon}px` : undefined,
      } as React.CSSProperties}
      aria-disabled={disabled}
      role="button" // Explicitly define role
      tabIndex={disabled ? -1 : 0} // Make it focusable if not disabled
      title={title || (typeof text === 'string' ? text : undefined)} // Use text for title if no specific title provided
      aria-label={ariaLabel || title || (typeof text === 'string' ? text : undefined)}
    >
      <div ref={iconRef} className={styles.icon}>
        {icon}
      </div>
      {text && (
        <div className={styles.text} ref={textRef}>
          {text}
        </div>
      )}
    </div>
  );
} 