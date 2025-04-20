import React, { useRef, useState, useEffect } from "react";
import clsx from "clsx";
import styles from "./chat.module.scss"; 

export function ChatAction(props: {
  text: string | null;
  icon: React.ReactElement;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  className?: string; // Added for potential custom styling
  disabled?: boolean; // Added for disabling action
}) {
  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState({
    full: 0,
    icon: 0,
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    updateWidth();
  }, []);

  function updateWidth() {
    if (!iconRef.current || !textRef.current) return;
    const getWidth = (dom: HTMLDivElement) => dom.getBoundingClientRect().width;
    const textWidth = getWidth(textRef.current);
    const iconWidth = getWidth(iconRef.current);
    setWidth({
      full: textWidth + iconWidth,
      icon: iconWidth,
    });
  }

  return (
    <div
      className={clsx(styles["chat-input-action"], "clickable", props.className, {
        [styles.disabled]: props.disabled,
      })}
      onClick={(event) => {
        if (props.disabled) return;
        props.onClick(event);
        if (isMounted) {
          setTimeout(updateWidth, 1);
        }
      }}
      onMouseEnter={isMounted ? updateWidth : undefined}
      onTouchStart={isMounted ? updateWidth : undefined}
      style={
        isMounted
          ? {
              ["--icon-width" as string]: `${width.icon}px`,
              ["--full-width" as string]: `${width.full}px`,
            } as React.CSSProperties
          : {}
      }
      aria-disabled={props.disabled}
    >
      <div ref={iconRef} className={styles["icon"]}>
        {props.icon}
      </div>
      {props.text && (
        <div className={styles["text"]} ref={textRef}>
          {props.text}
        </div>
      )}
    </div>
  );
} 