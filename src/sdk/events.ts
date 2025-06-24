import { User } from "./auth/types";
import { AttestationResult } from "@/types/attestation";
import { VerificationStatus } from "@/hooks/use-attestation-manager";
// import { Chat, ChatMessage, FileWithProgress } from "./Chat";
import { PandaConfig } from "./ConfigManager";

/* event-bus.ts */
export interface SDKEventMap {
  "app.locked": void;                          // no payload
  "app.unlocked": void;
  "chat.updated": void;
  "chat.list.updated": void;
  "user.updated": void;
  "auth.status.updated": boolean;
  "auth.state.updated": { isAuthenticated: boolean, isLocked: boolean, user: User | null };
  "attestation.status.updated": { status: VerificationStatus, attestationResult?: AttestationResult, publicKey: string };
  "config.updated": { config: PandaConfig };
}

/** Generic handler type that is aware of the payload shape */
type Handler<K extends keyof SDKEventMap> = (payload: SDKEventMap[K]) => void;

export class EventBus {
  private listeners: { [K in keyof SDKEventMap]?: Set<Handler<K>> } = {};

  on<K extends keyof SDKEventMap>(type: K, cb: Handler<K>): () => void {
    if (!this.listeners[type]) {
      this.listeners[type] = new Set() as any;
    }
    (this.listeners[type] as Set<Handler<K>>).add(cb);

    return () => (this.listeners[type] as Set<Handler<K>>).delete(cb);
  }

  emit<K extends keyof SDKEventMap>(type: K, payload: SDKEventMap[K]): void {
    this.listeners[type]?.forEach(cb => cb(payload));
  }
  
  off<K extends keyof SDKEventMap>(type: K, cb: Handler<K>): void {
    (this.listeners[type] as Set<Handler<K>>).delete(cb);
  }
}

type Listener<T = any> = (...args: T[]) => void;

export abstract class EventEmitter {
  private listeners: Map<string, Set<Listener>> = new Map();

  // This method must be implemented by subclasses to return their current state.
  abstract getState(): any;

  on(event: string, listener: Listener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    
    // Return an unsubscribe function
    return () => this.off(event, listener);
  }

  off(event: string, listener: Listener): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(listener);
    }
  }

  emit(event: string, ...args: any[]): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(listener => listener(...args));
    }
  }
}
