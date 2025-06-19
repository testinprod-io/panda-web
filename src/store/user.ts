import { createPersistStore } from "@/utils/store";
import { indexedDBStorage } from "@/utils/indexedDB-storage";
import { createJSONStorage } from "zustand/middleware";
import { StoreKey } from "@/types/constant";

export type UserState = {
  data: Record<string, any>;
};

export const DEFAULT_USER_STATE: UserState = {
  data: {},
};

export const useUserStore = createPersistStore(
  DEFAULT_USER_STATE,
  (set, get) => ({
    get<T>(key: string): T | undefined {
      return get().data[key] as T | undefined;
    },
    set<T>(key: string, value: T) {
      set((state) => ({
        data: {
          ...state.data,
          [key]: value,
        },
      }));
    },
    remove(key: string) {
      set((state) => {
        const newData = { ...state.data };
        delete newData[key];
        return {
          data: newData,
        };
      });
    },
    clear() {
      set(() => ({
        data: {},
      }));
    },
  }),
  {
    name: StoreKey.User,
    storage: createJSONStorage(() => indexedDBStorage),
  },
); 