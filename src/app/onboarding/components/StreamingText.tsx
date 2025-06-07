"use client";

import { useState, useEffect, FC } from "react";
import { Typography } from "@mui/material";

interface StreamingTextProps {
  text: string;
  className?: string;
  streamSpeed?: number;
}

const StreamingText: FC<StreamingTextProps> = ({
  text,
  className,
  streamSpeed = 20,
}) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    setDisplayedText("");
    const words = text;
    let currentText = "";
    let i = 0;

    const intervalId = setInterval(() => {
      if (i < words.length) {
        currentText += words[i];
        setDisplayedText(currentText);
        i++;
      } else {
        clearInterval(intervalId);
      }
    }, streamSpeed);

    return () => clearInterval(intervalId);
  }, [text, streamSpeed]);

  return (
    <Typography variant="h6" align="left" className={className}>
      {displayedText}
    </Typography>
  );
};

export default StreamingText; 