import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/types";

export function useScrollToBottom(
  scrollRef: RefObject<HTMLDivElement | null>,
  detach: boolean = false,
  messages: ChatMessage[]
) {
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

  useEffect(() => {
    if (autoScroll && !detach) {
      scrollDomToBottom();
    }
  }, [autoScroll, detach]);

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
