import React, { useRef, useState, useEffect } from "react";
import clsx from "clsx";
// import styles from "./action-button.module.scss"; // SCSS removed

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
  // State for dynamic width calculation (kept for now, to mimic original animation approach)
  const [calculatedWidth, setCalculatedWidth] = useState({ full: 0, icon: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    updateWidth();
  }, []);

  useEffect(() => {
    if (isMounted) {
      updateWidth();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, isMounted]); // Dependencies kept as in original

  function updateWidth() {
    if (!iconRef.current) return;
    const iconW = iconRef.current.getBoundingClientRect().width;
    let textW = 0;
    if (textRef.current && text) {
      // For hidden text, getBoundingClientRect might return 0. 
      // A common trick is to temporarily make it visible but off-screen, or measure a clone.
      // For simplicity here, we rely on the ref having some measurable width if text is present.
      // This might need adjustment if textRef.current.getBoundingClientRect().width is unreliable for initially hidden text.
      textRef.current.style.visibility = 'hidden'; // Temporarily make visible for measurement if it was display:none or opacity:0
      textRef.current.style.position = 'absolute'; // Avoid layout shift
      textW = textRef.current.getBoundingClientRect().width;
      textRef.current.style.visibility = ''; // Reset
      textRef.current.style.position = ''; // Reset
    }
    setCalculatedWidth({
      full: textW + iconW + (text ? 8 : 0), // 8px for padding-left on text
      icon: iconW,
    });
  }

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !onClick) return;
    onClick(event);
  };

  // Base Tailwind classes
  const actionButtonBase = "group inline-flex items-center cursor-pointer overflow-hidden relative";
  const transitions = "transition-all duration-300 ease-in-out"; // Simplified base transition for width/bg/border
  const disabledClasses = "disabled:opacity-50 disabled:cursor-not-allowed";
  
  const iconContainerClasses = "flex items-center justify-center relative shrink-0";
  const textContainerBase = "flex items-center justify-center whitespace-nowrap pl-2"; // pl-2 for 8px padding
  const textAnimationClasses = "opacity-0 -translate-x-3 transform transition-opacity transition-transform duration-200 ease-out pointer-events-none";
  const textVisibleClasses = "group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-x-0 group-focus-within:pointer-events-auto";
  const textDisabledHoverFocusClasses = "disabled:group-hover:opacity-0 disabled:group-hover:translate-x-3 disabled:group-focus-within:opacity-0 disabled:group-focus-within:translate-x-3";

  return (
    <div
      className={clsx(
        actionButtonBase,
        transitions,
        disabledClasses,
        className // Allow external classes
      )}
      onClick={handleClick}
      // onMouseEnter and onTouchStart for width calculation kept for now
      onMouseEnter={isMounted && text ? updateWidth : undefined} 
      onTouchStart={isMounted && text ? updateWidth : undefined}
      style={{
        // Using CSS variables for width if needed by consuming components, or direct style for icon-only width
        // The original logic for fixed width when no text is complex with Tailwind animations.
        // Simplifying: if no text, width will be icon width. If text, it expands.
        // The explicit width setting via JS might not be strictly necessary if Tailwind handles the text reveal, 
        // but kept to closely match original behavior if it relied on fixed width during animation.
        width: (!isMounted || !text) && calculatedWidth.icon > 0 ? `${calculatedWidth.icon}px` : (text && calculatedWidth.full > 0 ? undefined : `${calculatedWidth.icon || 'auto'}px`),
        // The following CSS variables are for compatibility or if external CSS uses them.
        // For pure Tailwind, they might not be strictly necessary if transitions are on opacity/transform.
        ['--icon-width' as string]: `${calculatedWidth.icon}px`,
        ['--full-width' as string]: `${calculatedWidth.full}px`,
      } as React.CSSProperties}
      aria-disabled={disabled}
      role="button"
      tabIndex={disabled ? -1 : 0}
      title={title || (typeof text === 'string' ? text : undefined)}
      aria-label={ariaLabel || title || (typeof text === 'string' ? text : undefined)}
    >
      <div ref={iconRef} className={iconContainerClasses}>
        {icon}
      </div>
      {text && (
        <div 
          ref={textRef} 
          className={clsx(
            textContainerBase, 
            textAnimationClasses, 
            !disabled && textVisibleClasses, // Apply hover/focus only if not disabled
            disabled && textDisabledHoverFocusClasses // Ensure text remains hidden if disabled
          )}
        >
          {text}
        </div>
      )}
    </div>
  );
} 