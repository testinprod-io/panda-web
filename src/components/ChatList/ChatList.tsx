"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

import { useChatStore } from "@/store/chat";
import { useChatActions } from "@/hooks/useChatActions";
import type { ChatSession } from "@/types/session"; 
import Locale from "@/locales"; 
import { ChatItem } from "./ChatItem";
import { ChatListSkeleton } from "./ChatListSkeleton";
import styles from "./chat-list.module.scss";

// Constants for calculating paging skeleton height, mirroring ChatListSkeleton.tsx logic
const PAGING_SK_HEADER_HEIGHT = 14;
const PAGING_SK_HEADER_MARGIN_BOTTOM = 18;
const PAGING_SK_ITEM_HEIGHT = 48;
const PAGING_SK_ITEM_MARGIN_BOTTOM = 10;
const PAGING_SK_GROUP_OUTER_MARGIN_BOTTOM = 28;
const PAGING_SK_MIN_ITEMS_PER_GROUP = 1;
const PAGING_SK_MAX_ITEMS_PER_GROUP = 4;
const ITEMS_PER_PAGE_FOR_SKELETON = 20; // We load 20 items per page

const AVG_ITEMS_PER_SK_GROUP = (PAGING_SK_MIN_ITEMS_PER_GROUP + PAGING_SK_MAX_ITEMS_PER_GROUP) / 2;
const H_SK_HEADER_AREA = PAGING_SK_HEADER_HEIGHT + PAGING_SK_HEADER_MARGIN_BOTTOM;
const H_SK_ITEMS_AREA_AVG = 
  AVG_ITEMS_PER_SK_GROUP * PAGING_SK_ITEM_HEIGHT + 
  (AVG_ITEMS_PER_SK_GROUP > 1 ? (AVG_ITEMS_PER_SK_GROUP - 1) : 0) * PAGING_SK_ITEM_MARGIN_BOTTOM;
const AVG_SK_GROUP_HEIGHT = H_SK_HEADER_AREA + H_SK_ITEMS_AREA_AVG + PAGING_SK_GROUP_OUTER_MARGIN_BOTTOM;
const NUM_SK_GROUPS_FOR_PAGING = ITEMS_PER_PAGE_FOR_SKELETON / AVG_ITEMS_PER_SK_GROUP;
const PAGING_SKELETON_TARGET_HEIGHT = NUM_SK_GROUPS_FOR_PAGING * AVG_SK_GROUP_HEIGHT;
// console.log(`[ChatList] Calculated PAGING_SKELETON_TARGET_HEIGHT: ${PAGING_SKELETON_TARGET_HEIGHT}px`);

// Helper to determine date group
const getRelativeDateGroup = (dateInput: number): string => { // Changed to number for lastUpdate
  const now = new Date();
  const then = new Date(dateInput);

  const diffTime = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (now.toDateString() === then.toDateString()) return "Today";
  // Ensure it was actually yesterday by comparing date part, not just diffDays === 1
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === then.toDateString()) return "Yesterday";

  if (diffDays < 7) return "Previous 7 Days";
  if (diffDays < 30) return "Previous 30 Days";
  
  if (now.getFullYear() === then.getFullYear()) {
    return then.toLocaleString('default', { month: 'long' });
  }
  return then.getFullYear().toString();
};

interface GroupedSessions {
  [groupName: string]: ChatSession[];
}

// Order of date groups for display
const groupOrder = [
  "Today",
  "Yesterday",
  "Previous 7 Days",
  "Previous 30 Days",
  // Months and years will be added dynamically and sorted if necessary
];

// Function to get a sortable key for month/year groups
const getMonthYearSortKey = (groupName: string, currentYear: number): string => {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  if (months.includes(groupName)) {
    // Format as YYYY-MM for sorting (e.g., 2024-03 for March 2024)
    return `${currentYear}-${(months.indexOf(groupName) + 1).toString().padStart(2, '0')}`;
  }
  // For year groups (e.g., "2023"), use the year itself, ensure it sorts after months of current year
  if (/^\d{4}$/.test(groupName)) {
    return groupName;
  }
  return groupName; // Fallback for predefined groups
};

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
  const [skeletonContainerHeight, setSkeletonContainerHeight] = useState<number>(0);

  // Get actions and store state needed for selection/deletion
  const { deleteSession, selectSession, updateConversation, loadSessionsFromServer } = useChatActions();
  const { currentSessionIndex, setCurrentSessionIndex } = useChatStore(); // For highlighting selected item
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
    if (localSessions.length === 0 && hasMore && !isInitialLoading) { 
      console.log("[ChatList] Triggering initial load (limit 20 by user change).");
      loadMoreSessions({ limit: 20 });
    }
  }, [loadMoreSessions, localSessions.length, hasMore, isInitialLoading]);

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

  // Effect to calculate skeleton count for initial load
  useEffect(() => {
    const calculateHeight = () => {
      if (listContainerRef.current) {
        const containerHeight = listContainerRef.current.clientHeight;
        setSkeletonContainerHeight(containerHeight);
        console.log(`[ChatList] Calculated skeleton container height: ${containerHeight}px`);
      } else {
        setSkeletonContainerHeight(500); // Fallback height
      }
    };

    const shouldCalculateAndListen = (isInitialLoading && localSessions.length === 0) || isPagingLoading;

    if (shouldCalculateAndListen) {
      calculateHeight(); 
      window.addEventListener('resize', calculateHeight);
      return () => {
        window.removeEventListener('resize', calculateHeight);
      };
    }
  }, [isInitialLoading, isPagingLoading, localSessions.length]);

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
            prevSessions.map(s => {
              if (s.id === currentSessionFromStore.id) {
                const storeSession = currentSessionFromStore;
                const localSessionCandidate = s; // This 's' is from prevSessions

                // If the local candidate (potentially our optimistic update) has a matching topic
                // to the store version (confirming it's the same rename context) and its
                // lastUpdate is newer, prefer the optimistic lastUpdate.
                // This prevents the store sync from reverting our fresh optimistic timestamp.
                if (localSessionCandidate.topic === storeSession.topic &&
                    localSessionCandidate.lastUpdate > storeSession.lastUpdate) {
                  return { ...storeSession, lastUpdate: localSessionCandidate.lastUpdate };
                }
                return storeSession; // Otherwise, take the store's version as is.
              }
              return s;
            })
          );
        }
      }
    }
    // localSessions is a dependency because we read from it (find) and map over it.
    // currentSessionFromStore is the primary trigger for this effect.
    // setLocalSessions is stable and provided by useState.
  }, [currentSessionFromStore, localSessions]); // setLocalSessions removed as per React guidelines for setters in deps

  const handleSelectItem = (session: ChatSession) => {
    selectSession(session.id);
    router.replace(`/chat/${session.id}`);
  };

  const handleDeleteItem = (session: ChatSession) => {
    if (window.confirm(Locale.Home.DeleteChat)) {
      const globallyCurrentSession = store.currentSession();
      const wasGloballyCurrent = globallyCurrentSession ? globallyCurrentSession.id === session.id : false;
      const isLastSessionInList = localSessions.length === 1;

      if (wasGloballyCurrent || isLastSessionInList) {
        setCurrentSessionIndex(-1); // Set current session to none BEFORE navigating
        router.push("/");       // Navigation starts

        // Delay deletion operations if navigation occurred
        setTimeout(() => {
          deleteSession(session.id);
          setLocalSessions(prev => prev.filter(s => s.id !== session.id));
          // setCurrentSessionIndex(-1); // This is already set before push, and covered by the else block or end of function for non-nav cases
        }, 1000); // 1-second delay
      } else {
        // If not navigating, delete immediately
        deleteSession(session.id);
        setLocalSessions(prev => prev.filter(s => s.id !== session.id));
        setCurrentSessionIndex(-1); // Reset index if no navigation happened
      }
    }
  };

  const handleRenameItem = (session: ChatSession, newName: string) => {
    const trimmedName = newName.trim();
    if (trimmedName && session.id) {
      const optimisticUpdateTime = Date.now();
      // Optimistically update local state first for immediate re-sorting
      setLocalSessions(prevSessions =>
        prevSessions.map(s =>
          s.id === session.id
            ? { ...s, topic: trimmedName, lastUpdate: optimisticUpdateTime }
            : s
        )
      );
      // Then, call the actual update operation
      updateConversation(session.id, { title: trimmedName });
    } else {
      console.error("[ChatList] Cannot rename session - missing identifier or empty name");
    }
  };

  const groupedSessions = localSessions.reduce<GroupedSessions>((acc, session) => {
    // Use `lastUpdate` which is a number (timestamp)
    const dateToGroup = session.lastUpdate; // Default to now if undefined for safety, though lastUpdate should exist
    const groupName = getRelativeDateGroup(dateToGroup);
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(session);
    return acc;
  }, {});

  // Sort group names: predefined first, then by month/year (recent first)
  const currentYear = new Date().getFullYear();
  const sortedGroupNames = Object.keys(groupedSessions).sort((a, b) => {
    const aIsPredefined = groupOrder.includes(a);
    const bIsPredefined = groupOrder.includes(b);

    if (aIsPredefined && bIsPredefined) {
      return groupOrder.indexOf(a) - groupOrder.indexOf(b);
    }
    if (aIsPredefined) return -1;
    if (bIsPredefined) return 1;

    // For dynamic groups (months/years), sort them reverse chronologically
    const sortKeyA = getMonthYearSortKey(a, currentYear);
    const sortKeyB = getMonthYearSortKey(b, currentYear);

    // Assuming keys like YYYY-MM or YYYY for sorting
    if (sortKeyA > sortKeyB) return -1; // Newer dates first
    if (sortKeyA < sortKeyB) return 1;
    return 0;
  });

  if (isInitialLoading && localSessions.length === 0) {
    return <ChatListSkeleton targetHeight={skeletonContainerHeight} />;
  }

  return (
    <div className={styles["chat-list"]} ref={listContainerRef}>
      {sortedGroupNames.map(groupName => (
        <div key={groupName} className={styles["chat-date-group"]}>
          <div className={styles["chat-date-header"]}>{groupName}</div>
          {groupedSessions[groupName]
            // Sort sessions within each group by lastActivity date, most recent first
            .sort((a, b) => b.lastUpdate - a.lastUpdate)
            .map((item, i) => (
              <ChatItem
                session={item}
                key={item.id}
                index={i} // Index within its own group, might not be globally unique for selection logic if needed
                selected={item.id === store.currentSession()?.id}
                onClick={() => handleSelectItem(item)}
                onDelete={() => handleDeleteItem(item)}
                onRename={(newTitle) => handleRenameItem(item, newTitle)}
                narrow={props.narrow}
              />
            ))}
        </div>
      ))}
      {hasMore && <div ref={observerRef} style={{ height: "1px", marginTop: "-1px" }} />} {/* Make observer target very small and unobtrusive */}
      {isPagingLoading && <ChatListSkeleton targetHeight={PAGING_SKELETON_TARGET_HEIGHT} />}
      {!isInitialLoading && localSessions.length === 0 && !hasMore && (
        <div className={styles["chat-date-header"]}>{"No conversations found"}</div>
      )}
    </div>
  );
}
