"use client";

import React, { useState, useEffect } from "react";

interface StreamingTextProps {
  text: string;
  style?: React.CSSProperties;
  onComplete?: () => void;
  streamSpeed?: number;
}

export default function StreamingText({
  text,
  style,
  onComplete,
  streamSpeed = 20,
}: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    setDisplayedText("");
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.substring(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        onComplete?.();
      }
    }, streamSpeed);

    return () => clearInterval(interval);
  }, [text, onComplete, streamSpeed]);

  return <span style={style}>{displayedText}</span>;
}