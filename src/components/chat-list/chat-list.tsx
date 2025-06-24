"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

import { useChatStore } from "@/store/chat";
import { useChatActions } from "@/hooks/use-chat-actions";
import type { ChatSession } from "@/types/session";
import Locale from "@/locales";
import { ChatItem } from "./chat-item";
import { ChatListSkeleton } from "./chat-list-skeleton";
import styles from "./chat-list.module.scss";
import { EncryptionService } from "@/services/encryption-service";

const PAGING_SK_HEADER_HEIGHT = 14;
const PAGING_SK_HEADER_MARGIN_BOTTOM = 18;
const PAGING_SK_ITEM_HEIGHT = 48;
const PAGING_SK_ITEM_MARGIN_BOTTOM = 10;
const PAGING_SK_GROUP_OUTER_MARGIN_BOTTOM = 28;
const PAGING_SK_MIN_ITEMS_PER_GROUP = 1;
const PAGING_SK_MAX_ITEMS_PER_GROUP = 4;
const ITEMS_PER_PAGE_FOR_SKELETON = 20;

const AVG_ITEMS_PER_SK_GROUP =
  (PAGING_SK_MIN_ITEMS_PER_GROUP + PAGING_SK_MAX_ITEMS_PER_GROUP) / 2;
const H_SK_HEADER_AREA =
  PAGING_SK_HEADER_HEIGHT + PAGING_SK_HEADER_MARGIN_BOTTOM;
const H_SK_ITEMS_AREA_AVG =
  AVG_ITEMS_PER_SK_GROUP * PAGING_SK_ITEM_HEIGHT +
  (AVG_ITEMS_PER_SK_GROUP > 1 ? AVG_ITEMS_PER_SK_GROUP - 1 : 0) *
    PAGING_SK_ITEM_MARGIN_BOTTOM;
const AVG_SK_GROUP_HEIGHT =
  H_SK_HEADER_AREA + H_SK_ITEMS_AREA_AVG + PAGING_SK_GROUP_OUTER_MARGIN_BOTTOM;
const NUM_SK_GROUPS_FOR_PAGING =
  ITEMS_PER_PAGE_FOR_SKELETON / AVG_ITEMS_PER_SK_GROUP;
const PAGING_SKELETON_TARGET_HEIGHT =
  NUM_SK_GROUPS_FOR_PAGING * AVG_SK_GROUP_HEIGHT;

const getRelativeDateGroup = (dateInput: number): string => {
  const now = new Date();
  const then = new Date(dateInput);

  const diffTime = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (now.toDateString() === then.toDateString()) return Locale.ChatList.Today;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === then.toDateString()) return Locale.ChatList.Yesterday;

  if (diffDays < 7) return Locale.ChatList.Previous7Days;
  if (diffDays < 30) return Locale.ChatList.Previous30Days;

  if (now.getFullYear() === then.getFullYear()) {
    return then.toLocaleString("default", { month: "long" });
  }
  return then.getFullYear().toString();
};

interface GroupedSessions {
  [groupName: string]: ChatSession[];
}

// Order of date groups for display
const groupOrder = [
  Locale.ChatList.Today,
  Locale.ChatList.Yesterday,
  Locale.ChatList.Previous7Days,
  Locale.ChatList.Previous30Days,
];

const getMonthYearSortKey = (
  groupName: string,
  currentYear: number,
): string => {
  const months = [
    Locale.ChatList.January,
    Locale.ChatList.February,
    Locale.ChatList.March,
    Locale.ChatList.April,
    Locale.ChatList.May,
    Locale.ChatList.June,
    Locale.ChatList.July,
    Locale.ChatList.August,
    Locale.ChatList.September,
    Locale.ChatList.October,
    Locale.ChatList.November,
    Locale.ChatList.December,
  ];
  if (months.includes(groupName)) {
    // Format as YYYY-MM for sorting (e.g., 2024-03 for March 2024)
    return `${currentYear}-${(months.indexOf(groupName) + 1).toString().padStart(2, "0")}`;
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
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(false);
  const [isPagingLoading, setIsPagingLoading] = useState<boolean>(false);
  const [skeletonContainerHeight, setSkeletonContainerHeight] =
    useState<number>(0);

  const {
    deleteSession,
    selectSession,
    updateConversation,
    loadSessionsFromServer,
  } = useChatActions();
  const store = useChatStore();
  const sessionsFromStore = store.sessions;
  const currentSessionFromStore = store.currentSession();
  const setCurrentSessionIndex = store.setCurrentSessionIndex;

  const router = useRouter();

  const observerRef = useRef<HTMLDivElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const loadMoreSessions = useCallback(
    async (options?: { cursor?: string | null; limit?: number }) => {
      const currentCursor = options?.cursor;
      const currentLimit = options?.limit;

      if (isPagingLoading || (currentCursor !== undefined && !hasMore)) {
        console.log(
          "[ChatList] Skipping fetch: already loading or no more data to fetch with a cursor.",
        );
        return;
      }

      console.log(
        `[ChatList] Loading sessions. Cursor: ${currentCursor}, Limit: ${currentLimit}`,
      );
      setIsPagingLoading(true);
      if (currentCursor === undefined) {
        setIsInitialLoading(true);
      }

      try {
        if (currentCursor !== undefined || sessionsFromStore.length > 0) {
          const randomDelay =
            Math.floor(Math.random() * (1500 - 1000 + 1)) + 1000; // Delay between 1000ms and 1500ms
          console.log(`[ChatList] Adding random delay: ${randomDelay}ms`);
          await sleep(randomDelay);
        }

        const result = await loadSessionsFromServer({
          cursor: currentCursor,
          limit: currentLimit,
        });
        if (result) {
          setNextCursor(result.nextCursor);
          setHasMore(result.hasMore);
        }
      } catch (error) {
        console.error("[ChatList] Failed to load sessions:", error);
      } finally {
        setIsPagingLoading(false);
        if (currentCursor === undefined) {
          setIsInitialLoading(false);
        }
      }
    },
    [
      loadSessionsFromServer,
      hasMore,
      isPagingLoading,
      sessionsFromStore,
      store,
    ],
  ); // Added store for sessionsFromStore dependency & stability of store methods

  useEffect(() => {
    if (sessionsFromStore.length === 0 && hasMore && !isInitialLoading) {
      console.log(
        "[ChatList] Triggering initial load (limit 20 by user change).",
      );
      loadMoreSessions({ limit: 20 });
    }
  }, [loadMoreSessions, sessionsFromStore.length, hasMore, isInitialLoading]); // Use sessionsFromStore.length

  useEffect(() => {
    const currentObserverRef = observerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isPagingLoading &&
          !isInitialLoading
        ) {
          console.log(
            "[ChatList] Observer triggered, loading next 20 sessions.",
          );
          loadMoreSessions({ cursor: nextCursor, limit: 20 });
        }
      },
      { threshold: 1.0 },
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
  }, [
    hasMore,
    nextCursor,
    isPagingLoading,
    isInitialLoading,
    loadMoreSessions,
  ]); // Added loadMoreSessions to deps as it's used

  useEffect(() => {
    const calculateHeight = () => {
      if (listContainerRef.current) {
        const containerHeight = listContainerRef.current.clientHeight;
        setSkeletonContainerHeight(containerHeight);
        console.log(
          `[ChatList] Calculated skeleton container height: ${containerHeight}px`,
        );
      } else {
        setSkeletonContainerHeight(500); // Fallback height
      }
    };

    const shouldCalculateAndListen =
      (isInitialLoading && sessionsFromStore.length === 0) || isPagingLoading;

    if (shouldCalculateAndListen) {
      calculateHeight();
      window.addEventListener("resize", calculateHeight);
      return () => {
        window.removeEventListener("resize", calculateHeight);
      };
    }
  }, [isInitialLoading, isPagingLoading, sessionsFromStore.length]); // Use sessionsFromStore.length

  useEffect(() => {
    if (currentSessionFromStore) {
      const sessionInStoreList = sessionsFromStore.find(
        (s) => s.id === currentSessionFromStore.id,
      );

      if (!sessionInStoreList) {
        // Optimistically add if it's a new session to the list (e.g. after creation)
        // Defensive check to prevent duplicates if it was somehow added concurrently
        // store.addSession handles prepending and ensuring uniqueness if ID matches.
        // However, currentSessionFromStore itself might be a new object not yet in store.sessions
        // Let's assume currentSessionFromStore is the "freshest" if it's not in the list by ID.
        if (
          !sessionsFromStore.some((s) => s.id === currentSessionFromStore.id)
        ) {
          store.addSession(currentSessionFromStore);
        }
      } else {
        // If the session is already in store.sessions, ensure we have the latest version from the store.
        // This handles updates to the session (e.g., topic change by generateSessionTitle).
        // We update if the object reference itself has changed, implying an update in the store.
        if (sessionInStoreList !== currentSessionFromStore) {
          // Object reference check
          store.updateTargetSession(
            { id: currentSessionFromStore.id },
            (session) => {
              // Apply the same merging logic for lastUpdate as before
              const storeVersion = currentSessionFromStore; // This is the incoming "truth" from store.currentSession()
              const existingVersionInList = sessionInStoreList; // This is session from store.sessions matching the ID

              // If the existing session in the list (which updateTargetSession provides as `session`)
              // has a matching topic to the currentSessionFromStore (confirming rename context)
              // and its lastUpdate is newer, prefer the existing lastUpdate (from a potential earlier optimistic update).
              // This comparison is subtle: currentSessionFromStore *is* the session from the store,
              // so this logic might be simpler: just update with currentSessionFromStore.
              // The original logic was to protect optimistic updates to `lastUpdate`.

              // If an optimistic update in ChatList (e.g., rename) updated lastUpdate,
              // and then the store syncs currentSessionFromStore, we want to keep the newer lastUpdate.
              // `session` here is the one from `store.sessions` that `updateTargetSession` is about to modify.
              if (
                session.topic === storeVersion.topic &&
                session.lastUpdate > storeVersion.lastUpdate
              ) {
                // Preserve the newer lastUpdate from the list if topics match
                Object.assign(session, {
                  ...storeVersion,
                  lastUpdate: session.lastUpdate,
                });
              } else {
                // Otherwise, fully update with currentSessionFromStore's data
                Object.assign(session, storeVersion);
              }
            },
          );
        }
      }
    }
  }, [currentSessionFromStore, sessionsFromStore, store]);

  const handleSelectItem = (session: ChatSession) => {
    selectSession(session.id);
    router.replace(`/chat/${session.id}`);
  };

  const handleDeleteItem = (session: ChatSession) => {
    if (window.confirm(Locale.Home.DeleteChat)) {
      const globallyCurrentSession = store.currentSession();
      const wasGloballyCurrent = globallyCurrentSession
        ? globallyCurrentSession.id === session.id
        : false;
      const isLastSessionInList = sessionsFromStore.length === 1;

      if (wasGloballyCurrent || isLastSessionInList) {
        setCurrentSessionIndex(-1);
        router.push("/");

        setTimeout(() => {
          deleteSession(session.id);
        }, 1000);
      } else {
        deleteSession(session.id);
        setCurrentSessionIndex(-1);
      }
    }
  };

  const handleRenameItem = (session: ChatSession, newName: string) => {
    const trimmedName = newName.trim();
    if (trimmedName && session.id) {
      const optimisticUpdateTime = Date.now();
      store.updateTargetSession({ id: session.id }, (s) => {
        s.visibleTopic = trimmedName;
        s.topic = EncryptionService.encrypt(trimmedName);
        s.lastUpdate = optimisticUpdateTime;
      });
      updateConversation(session.id, {
        title: EncryptionService.encrypt(trimmedName),
      });
    } else {
      console.error(
        "[ChatList] Cannot rename session - missing identifier or empty name",
      );
    }
  };

  const groupedSessions = sessionsFromStore.reduce<GroupedSessions>(
    (acc, session) => {
      // Use sessionsFromStore
      const dateToGroup = session.lastUpdate;
      const groupName = getRelativeDateGroup(dateToGroup);
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(session);
      return acc;
    },
    {},
  );

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

    if (sortKeyA > sortKeyB) return -1;
    if (sortKeyA < sortKeyB) return 1;
    return 0;
  });

  if (isInitialLoading && sessionsFromStore.length === 0) {
    // Use sessionsFromStore
    return <ChatListSkeleton targetHeight={skeletonContainerHeight} />;
  }

  return (
    <div className={styles["chat-list"]} ref={listContainerRef}>
      {sortedGroupNames.map((groupName) => (
        <div key={groupName} className={styles["chat-date-group"]}>
          <div className={styles["chat-date-header"]}>{groupName}</div>
          {groupedSessions[groupName]
            .sort((a, b) => b.lastUpdate - a.lastUpdate)
            .map((item, i) => (
              <ChatItem
                session={item}
                key={item.id}
                index={i}
                selected={item.id === store.currentSession()?.id}
                onClick={() => handleSelectItem(item)}
                onDelete={() => handleDeleteItem(item)}
                onRename={(newTitle) => handleRenameItem(item, newTitle)}
                narrow={props.narrow}
              />
            ))}
        </div>
      ))}
      {hasMore && (
        <div ref={observerRef} style={{ height: "1px", marginTop: "-1px" }} />
      )}{" "}
      {/* Make observer target very small and unobtrusive */}
      {isPagingLoading && (
        <ChatListSkeleton targetHeight={PAGING_SKELETON_TARGET_HEIGHT} />
      )}
      {!isInitialLoading &&
        sessionsFromStore.length === 0 &&
        !hasMore && ( // Use sessionsFromStore
          <div className={styles["chat-date-header"]}>
            {Locale.ChatList.NoConversations}
          </div>
        )}
    </div>
  );
}
