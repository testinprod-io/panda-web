"use client";

import React from "react";
import clsx from "clsx";

interface ChatListSkeletonProps {
  targetHeight: number;
}

// Constants for calculating heights
const SKELETON_HEADER_HEIGHT = 14; // px
const SKELETON_HEADER_MARGIN_BOTTOM = 18; // px (gap before first item)
const SKELETON_ITEM_HEIGHT = 48; // px
const SKELETON_ITEM_MARGIN_BOTTOM = 10; // px (gap between items in a group)
const SKELETON_GROUP_OUTER_MARGIN_BOTTOM = 28; // px (includes group specific margin + some item margin)

const MIN_ITEMS_PER_GROUP = 1;
const MAX_ITEMS_PER_GROUP = 4;
const MIN_HEADER_WIDTH = 50; // px
const MAX_HEADER_WIDTH = 120; // px

export function ChatListSkeleton({ targetHeight }: ChatListSkeletonProps) {
  const skeletonGroups = [];
  let accumulatedHeight = 0;
  let groupKey = 0;

  if (targetHeight <= 0) {
    return null; // Or a single minimal skeleton if preferred
  }

  while (accumulatedHeight < targetHeight) {
    const numItemsInGroup = 
      Math.floor(Math.random() * (MAX_ITEMS_PER_GROUP - MIN_ITEMS_PER_GROUP + 1)) + MIN_ITEMS_PER_GROUP;
    
    const headerWidth = 
      Math.floor(Math.random() * (MAX_HEADER_WIDTH - MIN_HEADER_WIDTH + 1)) + MIN_HEADER_WIDTH;

    let currentGroupHeight = SKELETON_HEADER_HEIGHT + SKELETON_HEADER_MARGIN_BOTTOM;
    if (numItemsInGroup > 0) {
      currentGroupHeight += numItemsInGroup * SKELETON_ITEM_HEIGHT;
      currentGroupHeight += (numItemsInGroup -1) * SKELETON_ITEM_MARGIN_BOTTOM; // Gaps between items
    }
    currentGroupHeight += SKELETON_GROUP_OUTER_MARGIN_BOTTOM; // Outer margin for the group

    // Ensure at least one group is added if targetHeight is small but positive
    if (skeletonGroups.length === 0 && currentGroupHeight === 0) {
        currentGroupHeight = SKELETON_HEADER_HEIGHT + SKELETON_HEADER_MARGIN_BOTTOM + SKELETON_ITEM_HEIGHT + SKELETON_GROUP_OUTER_MARGIN_BOTTOM; // min height for one item group
    }
    
    if (currentGroupHeight === 0) break; // Safety break if calculations somehow lead to zero height

    const items = [];
    for (let i = 0; i < numItemsInGroup; i++) {
      const numLines = Math.random() > 0.3 ? 2 : 1; // 70% chance of 2 lines
      const lines = [];
      for (let j = 0; j < numLines; j++) {
        const lineWidthPercentage = j === 0 ? 
            (Math.random() * (0.9 - 0.6) + 0.6) * 100 : // First line: 60-90%
            (Math.random() * (0.7 - 0.4) + 0.4) * 100;  // Second line: 40-70%
        lines.push(
          <div 
            key={j} 
            className="h-[14px] bg-gray-300 rounded animate-pulse"
            style={{ width: `${lineWidthPercentage}%` }}
          />
        );
      }
      items.push(
        <div key={i} className="h-[48px] rounded-lg mb-2.5 p-2.5 flex flex-col justify-center gap-2 bg-gray-100 animate-pulse">
          {lines}
        </div>
      );
    }

    skeletonGroups.push(
      <div key={groupKey++} className="mb-7 px-2">
        <div 
          className="h-[14px] bg-gray-200 rounded mb-[18px] animate-pulse"
          style={{ width: `${headerWidth}px` }}
        />
        {items}
      </div>
    );
    accumulatedHeight += currentGroupHeight;

    // Safety break if we are adding too many groups (e.g. if targetHeight is huge or calculation is off)
    if (groupKey > 50) break; 
  }

  return <div className="w-full overflow-hidden">{skeletonGroups}</div>;
} 