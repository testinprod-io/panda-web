"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

import { useChatStore } from "@/app/store/chat";
import { useChatActions } from "@/app/hooks/useChatActions";
import type { ChatSession } from "@/app/types/session"; 
import Locale from "@/app/locales"; 
import { ChatItem } from "./ChatItem";
import { ChatListSkeleton } from "./ChatListSkeleton";
import styles from "./chat-list.module.scss";

interface ChatListProps {
  narrow?: boolean;
}

export function ChatList(props: ChatListProps) {
  // Local state for sessions and pagination
  const [localSessions, setLocalSessions] = useState<ChatSession[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(false);
  const [isPagingLoading, setIsPagingLoading] = useState<boolean>(false);

  // Get actions and store state needed for selection/deletion
  const { deleteSession, selectSession, updateConversation, loadSessionsFromServer } = useChatActions();
  const { currentSessionIndex } = useChatStore(); // For highlighting selected item
  const store = useChatStore(); // For setCurrentSessionIndex
  const currentSessionFromStore = store.currentSession(); // Get the full current session object

  const router = useRouter();
  
  // Ref for the scrollable element (observer target)
  const observerRef = useRef<HTMLDivElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  // Helper for random delay
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Function to load sessions (initial or next page)
  const loadMoreSessions = useCallback(async (options?: { cursor?: string | null, limit?: number }) => {
    const currentCursor = options?.cursor;
    const currentLimit = options?.limit; 

    if (isPagingLoading || (currentCursor !== undefined && !hasMore)) {
        console.log("[ChatList] Skipping fetch: already loading or no more data to fetch with a cursor.");
        return;
    }
    
    console.log(`[ChatList] Loading sessions. Cursor: ${currentCursor}, Limit: ${currentLimit}`);
    setIsPagingLoading(true);
    if (currentCursor === undefined) { 
      setIsInitialLoading(true); 
    }

    try {
      // Add random backoff delay, but not for the very first initial load if desired (optional)
      if (currentCursor !== undefined || localSessions.length > 0) { // Apply delay for pagination or subsequent loads
        const randomDelay = Math.floor(Math.random() * (1500 - 1000 + 1)) + 1000; // Delay between 1000ms and 1500ms
        console.log(`[ChatList] Adding random delay: ${randomDelay}ms`);
        await sleep(randomDelay);
      }

      const result = await loadSessionsFromServer({ cursor: currentCursor, limit: currentLimit });
      if (result) {
        setLocalSessions(prevSessions => {
          const newSessions = result.sessions;
          if (currentCursor) { // Appending for pagination if cursor was provided
            const existingIds = new Set(prevSessions.map(s => s.id));
            const uniqueNewSessions = newSessions.filter(s => !existingIds.has(s.id));
            if (uniqueNewSessions.length < newSessions.length) {
                console.warn("[ChatList] Filtered out duplicate sessions received from server.");
            }
            return [...prevSessions, ...uniqueNewSessions];
          } else { // Initial load or refresh, replace
            return newSessions;
          }
        });
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
      }
    } catch (error) {
      console.error("[ChatList] Failed to load sessions:", error);
    } finally {
      setIsPagingLoading(false);
      // Only turn off initial loading if it was an initial load (no cursor)
      if (currentCursor === undefined) { 
        setIsInitialLoading(false);
      }
    }
  }, [loadSessionsFromServer, hasMore, isPagingLoading, localSessions.length]); 

  // Initial load
  useEffect(() => {
    if (localSessions.length === 0 && hasMore) { 
      console.log("[ChatList] Triggering initial load (limit 20 by user change).");
      loadMoreSessions({ limit: 20 });
    }
  }, [loadMoreSessions, localSessions.length, hasMore]);

  // Infinite scroll observer
  useEffect(() => {
    const currentObserverRef = observerRef.current; 
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isPagingLoading && !isInitialLoading) {
          console.log("[ChatList] Observer triggered, loading next 20 sessions.");
          loadMoreSessions({ cursor: nextCursor, limit: 20 }); 
        }
      },
      { threshold: 1.0 }
    );

    if (currentObserverRef) {
      observer.observe(currentObserverRef);
    }

    return () => {
      if (currentObserverRef) {
        observer.unobserve(currentObserverRef);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, nextCursor, isPagingLoading, isInitialLoading, loadMoreSessions]); // Added loadMoreSessions to deps as it's used

  // Optimistically add/update current session in the list
  useEffect(() => {
    if (currentSessionFromStore) {
      const sessionInLocalList = localSessions.find(s => s.id === currentSessionFromStore.id);

      if (!sessionInLocalList) {
        // Optimistically add if it's a new session to the list (e.g. after creation)
        setLocalSessions(prevSessions => {
          // Defensive check to prevent duplicates if it was somehow added concurrently
          if (prevSessions.some(s => s.id === currentSessionFromStore.id)) {
            return prevSessions;
          }
          // Prepend the new session, removing any potential (older) duplicates of it further down.
          const filteredPrevSessions = prevSessions.filter(s => s.id !== currentSessionFromStore.id);
          return [currentSessionFromStore, ...filteredPrevSessions];
        });
      } else {
        // If the session is already in localSessions, ensure we have the latest version from the store.
        // This handles updates to the session (e.g., topic change by generateSessionTitle).
        // We update if the object reference itself has changed, implying an update in the store.
        if (sessionInLocalList !== currentSessionFromStore) {
          setLocalSessions(prevSessions =>
            prevSessions.map(s =>
              s.id === currentSessionFromStore.id ? currentSessionFromStore : s
            )
          );
        }
      }
    }
    // localSessions is a dependency because we read from it (find) and map over it.
    // currentSessionFromStore is the primary trigger for this effect.
    // setLocalSessions is stable and provided by useState.
  }, [currentSessionFromStore, localSessions, setLocalSessions]);

  const handleSelectItem = (session: ChatSession) => {
    selectSession(session.id);
    router.replace(`/chat/${session.id}`);
  };

  const handleDeleteItem = async (session: ChatSession) => {
    if (window.confirm(Locale.Home.DeleteChat)) {
      deleteSession(session.id);

      setLocalSessions(prev => prev.filter(s => s.id !== session.id));

      const globallyCurrentSession = store.currentSession();
      const wasGloballyCurrent = globallyCurrentSession ? globallyCurrentSession.id === session.id : false;

      if (wasGloballyCurrent || localSessions.length === 1) {
        router.push("/chat");
      }
    }
  };

  const handleRenameItem = (session: ChatSession, newName: string) => {
    const trimmedName = newName.trim();
    if (trimmedName && session.id) {
      updateConversation(session.id, { title: trimmedName });
      setLocalSessions(prevSessions => 
        prevSessions.map(s => 
          s.id === session.id ? { ...s, topic: trimmedName } : s
        )
      );
    } else {
      console.error("[ChatList] Cannot rename session - missing identifier or empty name");
    }
  };

  if (isInitialLoading && localSessions.length === 0) {
    return <ChatListSkeleton count={5} />;
  }

  return (
    <div className={styles["chat-list"]} ref={listContainerRef}>
      {localSessions.map((item, i) => (
        <ChatItem
          session={item}
          key={item.id}
          index={i} 
          selected={item.id === store.currentSession()?.id} 
          onClick={() => {
            handleSelectItem(item);
          }}
          onDelete={() => handleDeleteItem(item)}
          onRename={(newTitle) => handleRenameItem(item, newTitle)}
          narrow={props.narrow}
        />
      ))}
      {hasMore && <div ref={observerRef} style={{ height: "0px" }} />} 
      {isPagingLoading && <ChatListSkeleton count={5} />} 
      {!hasMore && localSessions.length > 0 && <div className={styles["no-more-sessions"]}>{"No more sessions"}</div>} {/* Temp string */}
      {!isInitialLoading && localSessions.length === 0 && !hasMore && (
        <div className={styles["no-sessions-found"]}>{"No sessions found"}</div> /* Temp string */
      )}
    </div>
  );
}
