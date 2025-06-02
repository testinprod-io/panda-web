// Define types for the Tauri APIs used in utils.ts

declare global {
  interface Window {
    __TAURI__?: {
      writeText: (text: string) => Promise<void>;
      dialog: {
        save: (options?: {
          defaultPath?: string;
          filters?: { name: string; extensions: string[] }[];
        }) => Promise<string | null>;
      };
      fs: {
        writeTextFile: (path: string, contents: string) => Promise<void>;
      };
      updater: {
        checkUpdate: () => Promise<UpdateResult>;
        installUpdate: () => Promise<void>;
      };
      // Add other Tauri APIs here if needed
    };
  }

  // Define the UpdateResult type based on its usage
  interface UpdateResult {
    shouldUpdate: boolean;
    // Add other potential properties if known, e.g., manifest
  }
}

// Export an empty object to make this a module file
export {};
