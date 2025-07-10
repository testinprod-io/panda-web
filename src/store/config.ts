
import {
  DEFAULT_SIDEBAR_WIDTH,
  StoreKey,
} from "@/types/constant";
import { createPersistStore } from "@/utils/store";
import { indexedDBStorage } from "@/utils/indexedDB-storage";
import { createJSONStorage } from "zustand/middleware";
import { CustomizedPromptsData } from "@/types";

export enum SubmitKey {
  Enter = "Enter",
  CtrlEnter = "Ctrl + Enter",
  ShiftEnter = "Shift + Enter",
  AltEnter = "Alt + Enter",
  MetaEnter = "Meta + Enter",
}

export enum Theme {
  Auto = "auto",
  Dark = "dark",
  Light = "light",
}

export type AppConfig = {
  lastUpdate: number;
  submitKey: SubmitKey;
  avatar: string;
  fontSize: number;
  fontFamily: string;
  theme: Theme;
  tightBorder: boolean;
  sendPreviewBubble: boolean;
  enableAutoGenerateTitle: boolean;
  sidebarWidth: number;
  passwordExpirationMinutes: number;
};

export const DEFAULT_CONFIG: AppConfig = {
  lastUpdate: Date.now(),

  submitKey: SubmitKey.Enter,
  avatar: "1f603",
  fontSize: 16,
  fontFamily: "Inter",
  theme: Theme.Auto as Theme,
  tightBorder: false,
  sendPreviewBubble: false,
  enableAutoGenerateTitle: true,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  passwordExpirationMinutes: 10,
};

export function limitNumber(
  x: number,
  min: number,
  max: number,
  defaultValue: number,
) {
  if (isNaN(x)) {
    return defaultValue;
  }

  return Math.min(max, Math.max(min, x));
}

export const useAppConfig = createPersistStore(
  DEFAULT_CONFIG,
  (set, get) => ({
    reset() {
      set(() => ({
        ...DEFAULT_CONFIG,
      }));
    },

    setPasswordExpirationMinutes(minutes: number) {
      set(() => ({
        passwordExpirationMinutes: minutes,
      }));
    },
    
    setTheme(theme: Theme) {
      set(() => ({
        theme: theme,
      }));
    },
  }),
  {
    name: StoreKey.Config,
    version: 1.4,
    storage: createJSONStorage(() => indexedDBStorage),
    migrate: (persistedState: unknown, version: number): AppConfig => {
      const oldState = persistedState as Partial<AppConfig>;

      if (version < 1.4) {
        console.log(
          `[AppConfigStore] Migrating config from version ${version} to 1.4`,
        );
        return {
          ...DEFAULT_CONFIG,
          ...oldState,
          theme: oldState.theme ?? Theme.Auto,
          passwordExpirationMinutes: oldState.passwordExpirationMinutes ?? 10,
        };
      }

      if (version < 1.3) {
        console.log(
          `[AppConfigStore] Migrating config from version ${version} to 1.3`,
        );
        return {
          ...DEFAULT_CONFIG,
          ...oldState,
          lastUpdate: Date.now(),
        };
      }

      return { ...DEFAULT_CONFIG, ...oldState } as AppConfig;
    },
  },
);
