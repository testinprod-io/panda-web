import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/types";

export function useScrollToBottom(
  scrollRef: RefObject<HTMLDivElement | null>,
  detach: boolean = false,
  messages: ChatMessage[], // Assuming ChatMessage type is needed, adjust if not
) {
  // for auto-scroll
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollDomToBottom = useCallback(() => {
    const dom = scrollRef.current;
    if (dom) {
      requestAnimationFrame(() => {
        setAutoScroll(true);
        dom.scrollTo(0, dom.scrollHeight);
      });
    }
  }, [scrollRef]);

  // auto scroll
  useEffect(() => {
    if (autoScroll && !detach) {
      scrollDomToBottom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScroll, detach]); // Removed scrollDomToBottom dependency as it's stable

  // auto scroll when messages length changes
  const lastMessagesLength = useRef(messages.length);
  useEffect(() => {
    if (messages.length > lastMessagesLength.current && !detach) {
      scrollDomToBottom();
    }
    lastMessagesLength.current = messages.length;
  }, [messages.length, detach, scrollDomToBottom]);

  return {
    scrollRef,
    autoScroll,
    setAutoScroll,
    scrollDomToBottom,
  };
} 