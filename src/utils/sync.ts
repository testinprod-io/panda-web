import { ChatSession } from "@/types/session";
import {
    useAppConfig,
    useChatStore,
  } from "@/store";
  import { StoreKey } from "@/types/constant";
  import { merge } from "./merge";
  
  type NonFunctionKeys<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? never : K;
  }[keyof T];
  type NonFunctionFields<T> = Pick<T, NonFunctionKeys<T>>;
  
  export function getNonFunctionFileds<T extends object>(obj: T) {
    const ret: any = {};
  
    Object.entries(obj).map(([k, v]) => {
      if (typeof v !== "function") {
        ret[k] = v;
      }
    });
  
    return ret as NonFunctionFields<T>;
  }
  
  export type GetStoreState<T> = T extends { getState: () => infer U }
    ? NonFunctionFields<U>
    : never;
  
  const LocalStateSetters = {
    [StoreKey.Chat]: useChatStore.setState,
    [StoreKey.Config]: useAppConfig.setState,
  } as const;
  
  const LocalStateGetters = {
    [StoreKey.Chat]: () => getNonFunctionFileds(useChatStore.getState()),
    [StoreKey.Config]: () => getNonFunctionFileds(useAppConfig.getState()),
  } as const;
  
  export type AppState = {
    [k in keyof typeof LocalStateGetters]: ReturnType<
      (typeof LocalStateGetters)[k]
    >;
  };
  
  type Merger<T extends keyof AppState, U = AppState[T]> = (
    localState: U,
    remoteState: U,
  ) => U;
  
  type StateMerger = {
    [K in keyof AppState]: Merger<K>;
  };
  
  // we merge remote state to local state
  const MergeStates: StateMerger = {
    [StoreKey.Chat]: (localState, remoteState) => {
      // merge sessions
      const localSessions: Record<string, ChatSession> = {};
      localState.sessions.forEach((s) => (localSessions[s.id] = s));
  
      remoteState.sessions.forEach((remoteSession) => {
        const localSession = localSessions[remoteSession.id];
        if (!localSession) {
          // if remote session is new, just merge it
          localState.sessions.push(remoteSession);
        }
      });
  
      // sort local sessions with date field in desc order
      localState.sessions.sort(
        (a, b) =>
          new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime(),
      );
  
      return localState;
    },
    [StoreKey.Config]: mergeWithUpdate<AppState[StoreKey.Config]>,
  };
  
  export function getLocalAppState() {
    const appState = Object.fromEntries(
      Object.entries(LocalStateGetters).map(([key, getter]) => {
        return [key, getter()];
      }),
    ) as AppState;
  
    return appState;
  }
  
  export function setLocalAppState(appState: AppState) {
    for (const key in LocalStateSetters) {
      const storeKey = key as keyof typeof LocalStateSetters; // or keyof AppState
      const setter = LocalStateSetters[storeKey];
      const stateForStore = appState[storeKey];
      // Assert that the specific setter can handle the specific state slice for this key.
      (setter as (state: typeof stateForStore) => void)(stateForStore);
    }
  }
  
  export function mergeAppState(localState: AppState, remoteState: AppState) {
    Object.keys(localState).forEach(<T extends keyof AppState>(k: string) => {
      const key = k as T;
      const localStoreState = localState[key];
      const remoteStoreState = remoteState[key];
      MergeStates[key](localStoreState, remoteStoreState);
    });
  
    return localState;
  }
  
  /**
   * Merge state with `lastUpdateTime`, older state will be override
   */
  export function mergeWithUpdate<T extends { lastUpdateTime?: number }>(
    localState: T,
    remoteState: T,
  ) {
    const localUpdateTime = localState.lastUpdateTime ?? 0;
    const remoteUpdateTime = localState.lastUpdateTime ?? 1;
  
    if (localUpdateTime < remoteUpdateTime) {
      merge(remoteState, localState);
      return { ...remoteState };
    } else {
      merge(localState, remoteState);
      return { ...localState };
    }
  }
  