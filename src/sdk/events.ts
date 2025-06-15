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
