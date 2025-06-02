"use client";

import React from "react";
import styles from "./chat-list-skeleton.module.scss";

interface ChatListSkeletonProps {
  targetHeight: number;
}

const SKELETON_HEADER_HEIGHT = 14;
const SKELETON_HEADER_MARGIN_BOTTOM = 18;
const SKELETON_ITEM_HEIGHT = 48;
const SKELETON_ITEM_MARGIN_BOTTOM = 10;
const SKELETON_GROUP_OUTER_MARGIN_BOTTOM = 28;

const MIN_ITEMS_PER_GROUP = 1;
const MAX_ITEMS_PER_GROUP = 4;
const MIN_HEADER_WIDTH = 50;
const MAX_HEADER_WIDTH = 120;

export function ChatListSkeleton({ targetHeight }: ChatListSkeletonProps) {
  const skeletonGroups = [];
  let accumulatedHeight = 0;
  let groupKey = 0;

  if (targetHeight <= 0) {
    return null;
  }

  while (accumulatedHeight < targetHeight) {
    const numItemsInGroup =
      Math.floor(
        Math.random() * (MAX_ITEMS_PER_GROUP - MIN_ITEMS_PER_GROUP + 1),
      ) + MIN_ITEMS_PER_GROUP;

    const headerWidth =
      Math.floor(Math.random() * (MAX_HEADER_WIDTH - MIN_HEADER_WIDTH + 1)) +
      MIN_HEADER_WIDTH;

    let currentGroupHeight =
      SKELETON_HEADER_HEIGHT + SKELETON_HEADER_MARGIN_BOTTOM;
    if (numItemsInGroup > 0) {
      currentGroupHeight += numItemsInGroup * SKELETON_ITEM_HEIGHT;
      currentGroupHeight += (numItemsInGroup - 1) * SKELETON_ITEM_MARGIN_BOTTOM;
    }
    currentGroupHeight += SKELETON_GROUP_OUTER_MARGIN_BOTTOM;

    if (skeletonGroups.length === 0 && currentGroupHeight === 0) {
      currentGroupHeight =
        SKELETON_HEADER_HEIGHT +
        SKELETON_HEADER_MARGIN_BOTTOM +
        SKELETON_ITEM_HEIGHT +
        SKELETON_GROUP_OUTER_MARGIN_BOTTOM;
    }

    if (currentGroupHeight === 0) break;

    const items = [];
    for (let i = 0; i < numItemsInGroup; i++) {
      const numLines = Math.random() > 0.3 ? 2 : 1;
      const lines = [];
      for (let j = 0; j < numLines; j++) {
        const lineWidthPercentage =
          j === 0
            ? (Math.random() * (0.9 - 0.6) + 0.6) * 100
            : (Math.random() * (0.7 - 0.4) + 0.4) * 100;
        lines.push(
          <div
            key={j}
            className={styles.skeletonLine}
            style={{ width: `${lineWidthPercentage}%` }}
          />,
        );
      }
      items.push(
        <div key={i} className={styles.skeletonItem}>
          {lines}
        </div>,
      );
    }

    skeletonGroups.push(
      <div key={groupKey++} className={styles.skeletonGroup}>
        <div
          className={styles.skeletonHeader}
          style={{ width: `${headerWidth}px` }}
        />
        {items}
      </div>,
    );
    accumulatedHeight += currentGroupHeight;

    if (groupKey > 50) break;
  }

  return <div className={styles.skeletonWrapper}>{skeletonGroups}</div>;
}
