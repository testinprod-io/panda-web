export interface UserData {
  encryptedId?: string;
  customizedPromptsData?: Record<string, any>;
  [key: string]: any;
}

export interface IUserDataStore {
  get(): Promise<UserData>;
  set(data: Partial<UserData>): Promise<void>;
  clear(): Promise<void>;
}

export class MemoryUserDataStore implements IUserDataStore {
  private store: UserData = {};

  async get(): Promise<UserData> {
    return Promise.resolve({ ...this.store });
  }

  async set(data: Partial<UserData>): Promise<void> {
    this.store = { ...this.store, ...data };
    return Promise.resolve();
  }

  async clear(): Promise<void> {
    this.store = {};
    return Promise.resolve();
  }
}

export class UserManager {
  private store: IUserDataStore;

  constructor(store: IUserDataStore) {
    this.store = store;
  }

  get data(): Promise<UserData> {
    return this.store.get();
  }

  async updateData(data: Partial<UserData>): Promise<void> {
    await this.store.set(data);
  }

  async clearData(): Promise<void> {
    await this.store.clear();
  }

  async getEncryptedId(): Promise<string | undefined> {
    const data = await this.store.get();
    return data.encryptedId;
  }
}
