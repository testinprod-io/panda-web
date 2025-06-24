"use client";

import { useSyncExternalStore } from 'react';
import { usePandaSDK } from '@/providers/sdk-provider';
import { Chat } from "./Chat";
import { UserData } from './User';
import { CustomizedPromptsData } from '@/types';

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
  const sdk = usePandaSDK();
  
  const state = useSyncExternalStore(
    (callback) => {
      if (!chat) return () => {};
      return sdk.bus.on('chat.updated', callback);
    },
    () => chat?.getState(),
  );

  return state || chat?.getState() || { messages: [], isLoading: true, hasMoreMessages: false };
}

export function useAuth() {
  const sdk = usePandaSDK();
  const authManager = sdk.auth;
  const state = useSyncExternalStore(
    (callback) => sdk.bus.on('auth.state.updated', callback),
    () => {
      return authManager.getState();
    },
    () => authManager.getState(),
  );
  return state || authManager.getState();
}

export function useAttestation() {
  const sdk = usePandaSDK();
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
  const sdk = usePandaSDK();
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