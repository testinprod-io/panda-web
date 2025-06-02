import React, { useRef } from "react";
import clsx from "clsx";
import styles from "./action-button.module.scss";

export interface ActionButtonProps {
  text?: string | null;
  icon: React.ReactElement;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
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
        "clickable",
        className,
      )}
      onClick={handleClick}
      aria-disabled={disabled}
      role="button"
      tabIndex={disabled ? -1 : 0}
      title={title || (typeof text === 'string' ? text : undefined)}
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