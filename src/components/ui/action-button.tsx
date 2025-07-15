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
  const { text, icon, onClick, className, disabled, title, ariaLabel } = props;

  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !onClick) return;
    onClick(event);
  };

  return (
    <div
      className={clsx(styles.actionButton, "clickable", className)}
      onClick={handleClick}
      aria-disabled={disabled}
      role="button"
      tabIndex={disabled ? -1 : 0}
      title={title || (typeof text === "string" ? text : undefined)}
      aria-label={
        ariaLabel || title || (typeof text === "string" ? text : undefined)
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        cursor: "pointer",
        overflow: "hidden",
        position: "relative",
        transition: "background-color 0.2s ease, border-color 0.2s ease",
      }}
    >
      <div
        ref={iconRef}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          flexShrink: "0",
        }}
      >
        {icon}
      </div>
      {text && (
        <div
          ref={textRef}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            whiteSpace: "nowrap",
            paddingLeft: "8px",
            opacity: "0",
            transform: "translateX(-10px)",
            transition: "opacity 0.2s ease-out, transform 0.2s ease-out",
            pointerEvents: "none",
            willChange: "opacity, transform",
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}
