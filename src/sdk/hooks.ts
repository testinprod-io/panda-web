"use client";

import { useSyncExternalStore } from 'react';
import { usePandaSDK } from '@/providers/sdk-provider';
import { Chat } from "./Chat";

/**
 * A modern hook to subscribe to the state of the ChatManager.
 * It uses useSyncExternalStore to efficiently update components
 * when the chat list changes.
 * 
 * @returns An object containing the current list of chats, loading state,
 *          and whether more chats are available for pagination.
 */
export function useChatList() {
  const sdk = usePandaSDK();
  const chatManager = sdk.chat;

  const state = useSyncExternalStore(
    (callback) => chatManager.on('update', callback),
    () => chatManager.getState(),
  );

  return state || chatManager.getState();
}

/**
 * A hook to subscribe to the state of a specific Chat instance.
 * It uses useSyncExternalStore to efficiently update components
 * when the chat's messages or state (like isLoading) change.
 * 
 * @param chat The Chat instance to subscribe to.
 * @returns The current state of the chat, including messages, loading status, etc.
 */
export function useChat(chat: Chat | null) {
  const state = useSyncExternalStore(
    (callback) => {
      if (!chat) return () => {};
      return chat.on('update', callback);
    },
    () => chat?.getState(),
  );

  return state || chat?.getState() || { messages: [], isLoading: true, hasMoreMessages: false };
}
