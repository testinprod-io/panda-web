type Listener<T = any> = (...args: T[]) => void;

export abstract class EventEmitter {
  protected listeners: Map<string, Set<Listener>> = new Map();

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
      // Clean up empty sets
      if (this.listeners.get(event)!.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for '${event}':`, error);
        }
      });
    }
  }

  /**
   * Removes all listeners for a specific event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Returns the number of listeners for a specific event
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size || 0;
  }

  /**
   * Returns all event names that have listeners
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Cleanup method to remove all listeners
   */
  protected cleanup(): void {
    this.listeners.clear();
  }
}
