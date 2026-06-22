/**
 * LRU Memory Cache with TTL expiration.
 * Shared across serverless functions (cached in cold-start module scope).
 */
export class MemoryCache {
  private store = new Map<string, { value: unknown; expiresAt: number }>()
  private maxSize: number

  constructor(maxSize = 100) {
    this.maxSize = maxSize
  }

  get(key: string): unknown | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    // Move to end (most recently used)
    this.store.delete(key)
    this.store.set(key, entry)
    return entry.value
  }

  set(key: string, value: unknown, ttlMs: number): void {
    if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value
      if (oldestKey) this.store.delete(oldestKey)
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs })
  }
}

// Singleton — reused across invocations on the same container
export const cache = new MemoryCache(100)
