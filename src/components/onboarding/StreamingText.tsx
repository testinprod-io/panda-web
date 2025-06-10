"use client";

import { useState, useEffect, FC, CSSProperties } from "react";
import { Typography } from "@mui/material";

interface StreamingTextProps {
  text: string;
  style?: CSSProperties;
  streamSpeed?: number;
}

const StreamingText: FC<StreamingTextProps> = ({
  text,
  style,
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
    <Typography variant="h6" align="left" style={style}>
      {displayedText}
    </Typography>
  );
};

export default StreamingText; 