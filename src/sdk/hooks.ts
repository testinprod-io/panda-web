"use client";

import { useSyncExternalStore, useCallback } from 'react';
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
  const { sdk } = usePandaSDK();
  const chatManager = sdk?.chat;

  const state = useSyncExternalStore(
    (callback) => sdk.bus.on('chat.list.updated', callback),
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
  const { sdk } = usePandaSDK();
  
  const subscribe = useCallback((callback: () => void) => {
    if (!chat) {
      console.log("[useChat] No chat provided, not subscribing.");
      return () => {};
    }
    const eventName = `chat.updated:${chat.id}` as const;
    const unsubscribe = sdk.bus.on(eventName, () => {
      callback();
    });

    return () => {
      unsubscribe();
    }
  }, [sdk.bus, chat]);

  const state = useSyncExternalStore(
    subscribe,
    () => chat?.getState(),
    () => chat?.getState()
  );

  return state || chat?.getState() || { title: "", encryptedTitle: "", messages: [], isLoading: true, hasMoreMessages: false };
}

export function useAuth() {
  const { sdk } = usePandaSDK();
  const authManager = sdk.auth;
  const state = useSyncExternalStore(
    (callback) => sdk.bus.on('auth.state.updated', callback),
    () => {
      return authManager.getState();
    },
    () => authManager.getState(),
  );
  return { 
    ...(state || authManager.getState()),
    logout: authManager.logout.bind(authManager),
    lockApp: authManager.lock.bind(authManager),
    unlockApp: authManager.unlock.bind(authManager),
  }
}

export function useAttestation() {
  const { sdk } = usePandaSDK();
  const attestationManager = sdk.attestation;
  const state = useSyncExternalStore(
    (callback) => sdk.bus.on('attestation.status.updated', callback),
    () => {
      return attestationManager.getState();
    },
    () => attestationManager.getState(),
  );
  return state || attestationManager.getState();
}

export function useUser() {
  const { sdk } = usePandaSDK();
  const userManager = sdk.user;
  const state = useSyncExternalStore(
    (callback) => sdk.bus.on('user.updated', callback),
    () => {
      return userManager.getState();
    },
    () => userManager.getState(),
  );
  return {
    data: state || userManager.getState(),
    updateCustomizedPrompts: userManager.updateCustomizedPrompts.bind(userManager),
    updateData: userManager.updateData.bind(userManager),
    clearData: userManager.clearData.bind(userManager),
  };
}

export function useConfig() {
  const { sdk } = usePandaSDK();
  const configManager = sdk.config;
  
  const state = useSyncExternalStore(
    (callback) => sdk.bus.on('config.updated', callback),
    () => { return configManager.getConfig() } ,
    () => configManager.getConfig()
  );

  return state || configManager.getConfig();
} 