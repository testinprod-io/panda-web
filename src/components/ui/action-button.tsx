import React, { useRef } from "react";
import clsx from "clsx";
import styles from "./action-button.module.scss";

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

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !onClick) return;
    onClick(event);
  };

  return (
    <div
      className={clsx(
        styles.actionButton,
        "clickable", // Kept for potential global styles or compatibility
        className,
      )}
      onClick={handleClick}
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