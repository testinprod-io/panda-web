import { EventBus } from "./events";
import { CustomizedPromptsData } from "@/types";

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
  private bus: EventBus;
  private state: UserData = {};

  constructor(store: IUserDataStore, bus: EventBus) {
    this.store = store;
    this.bus = bus;
    this.loadInitialData();
  }

  private async loadInitialData() {
    this.state = await this.store.get();
    this.bus.emit("user.updated", undefined);
  }

  getState() {
    return this.state;
  }

  get data(): UserData {
    return this.state;
  }

  async updateCustomizedPrompts(
    data: Partial<CustomizedPromptsData>
  ): Promise<void> {
    const newState = {
      ...this.state,
      customizedPromptsData: { ...this.state.customizedPromptsData, ...data },
    };
    await this.store.set(newState);
    this.state = newState;
    this.bus.emit("user.updated", undefined);
  }

  async updateData(data: Partial<UserData>): Promise<void> {
    const newState = { ...this.state, ...data };
    await this.store.set(newState);
    this.state = newState;
    this.bus.emit("user.updated", undefined);
  }

  async clearData(): Promise<void> {
    await this.store.clear();
    this.state = {};
    this.bus.emit("user.updated", undefined);
  }

  getEncryptedId(): string | undefined {
    return this.state.encryptedId;
  }
}
