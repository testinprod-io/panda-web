import { create } from "zustand";
import { combine, persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { Updater } from "@/types/common";
import { deepClone } from "./clone";
import { indexedDBStorage } from "./indexedDB-storage";

type SecondParam<T> = T extends (
  _f: infer _F,
  _s: infer S,
  ...args: infer _U
) => any
  ? S
  : never;

// Original MakeUpdater (not exported)
export type MakeUpdater<T> = {
  lastUpdateTime: number;
  _hasHydrated: boolean;

  markUpdate: () => void;
  update: Updater<T>;
  setHasHydrated: (state: boolean) => void;
};

type SetStoreState<T> = (
  partial: T | Partial<T> | ((state: T) => T | Partial<T>),
  replace?: boolean,
) => void;


export function createPersistStore<T extends object, M>(
  state: T,
  methods: (
    set: SetStoreState<T & MakeUpdater<T>>,
    get: () => T & MakeUpdater<T>,
  ) => M,
  // Use the original simpler type for persistOptions
  persistOptions: SecondParam<typeof persist>,
) {
  // Use createJSONStorage directly if storage isn't provided, assuming indexedDB
  persistOptions.storage = persistOptions.storage ?? createJSONStorage(() => indexedDBStorage);
  const oldOnRehydrateStorage = persistOptions?.onRehydrateStorage;
  persistOptions.onRehydrateStorage = (state) => {
    // Original simplified rehydration logic
    oldOnRehydrateStorage?.(state);
    // Return the function that sets hydration state
    return (_hydratedState, error) => {
        if (error) {
            console.error(`[createPersistStore] Error during rehydration for store ${persistOptions.name}:`, error);
            // Optionally handle the error further
        }
        // Ensure setHasHydrated is called after rehydration attempt
        // Need to cast state because TS doesn't know it has setHasHydrated here
        (state as unknown as MakeUpdater<T>)?.setHasHydrated(true);
    };
  };

  return create(
    persist(
      combine(
        {
          ...state,
          lastUpdateTime: 0,
          _hasHydrated: false,
        },
        (set, get) => {
          return {
            ...methods(set as SetStoreState<T & MakeUpdater<T>>, get as any),

            markUpdate() {
              set({ lastUpdateTime: Date.now() } as Partial<
                T & M & MakeUpdater<T>
              >);
            },
            update(updater) {
              const state = deepClone(get());
              updater(state);
              set({
                ...state,
                lastUpdateTime: Date.now(),
              });
            },
            setHasHydrated: (state: boolean) => {
              set({ _hasHydrated: state } as Partial<T & M & MakeUpdater<T>>);
            },
          } as M & MakeUpdater<T>;
        },
      ),
      // Pass persistOptions directly, potentially casting if needed but try without first
      persistOptions as any, // Use 'as any' here as the specific type can be complex
    ),
  );
}
