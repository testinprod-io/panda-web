import { IStorage, PaginatedChats, PaginatedMessages, PaginatedSummaries } from './i-storage';
import { ServerStorage } from './server-storage';
import { LocalStorage } from './local-storage';
import { MemoryStorage } from './memory-storage';

// Re-export types
export type { IStorage, PaginatedChats, PaginatedMessages, PaginatedSummaries };

// Re-export classes
export { ServerStorage, LocalStorage, MemoryStorage };

// Storage type enum for easy switching
export enum StorageType {
  SERVER = 'server',
  LOCAL = 'local', 
  MEMORY = 'memory'
}

// Factory function to create storage instances
export function createStorage(
  type: StorageType,
  bus: any,
  api: any,
  authManager: any,
  encryptionService: any
): IStorage {
  switch (type) {
    case StorageType.SERVER:
      return new ServerStorage(bus, api, authManager, encryptionService);
    case StorageType.LOCAL:
      return new LocalStorage(bus, api, authManager, encryptionService);
    case StorageType.MEMORY:
      return new MemoryStorage(bus, api, authManager, encryptionService);
    default:
      throw new Error(`Unknown storage type: ${type}`);
  }
}