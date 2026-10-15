/**
 * In-memory cache placeholder for local UI use only.
 * This module does not connect to Redis and is not a distributed production rate limiter.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheService {
  private inMemoryStore = new Map<string, CacheEntry<unknown>>();
  private rateLimitCounts = new Map<string, { count: number; resetAt: number }>();
  constructor() {
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanupExpired(), 60000);
    }
  }

  private cleanupExpired() {
    const now = Date.now();
    for (const [key, entry] of this.inMemoryStore.entries()) {
      if (entry.expiresAt <= now) {
        this.inMemoryStore.delete(key);
      }
    }
    for (const [ip, record] of this.rateLimitCounts.entries()) {
      if (record.resetAt <= now) {
        this.rateLimitCounts.delete(ip);
      }
    }
  }

  /**
   * Retrieve cached item by key
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.inMemoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.inMemoryStore.delete(key);
      return null;
    }
    return entry.value as T;
  }

  /**
   * Cache item with TTL in seconds
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    this.inMemoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete key or pattern from cache
   */
  async del(key: string): Promise<void> {
    this.inMemoryStore.delete(key);
  }

  /**
   * Rate limiting: Allow maxRequests within windowSeconds
   */
  async rateLimit(identifier: string, maxRequests = 60, windowSeconds = 60): Promise<{
    allowed: boolean;
    remaining: number;
    resetInSeconds: number;
  }> {
    const now = Date.now();
    const existing = this.rateLimitCounts.get(identifier);

    if (!existing || existing.resetAt <= now) {
      this.rateLimitCounts.set(identifier, {
        count: 1,
        resetAt: now + windowSeconds * 1000,
      });
      return { allowed: true, remaining: maxRequests - 1, resetInSeconds: windowSeconds };
    }

    if (existing.count >= maxRequests) {
      const resetInSeconds = Math.ceil((existing.resetAt - now) / 1000);
      return { allowed: false, remaining: 0, resetInSeconds };
    }

    existing.count += 1;
    const remaining = maxRequests - existing.count;
    const resetInSeconds = Math.ceil((existing.resetAt - now) / 1000);
    return { allowed: true, remaining, resetInSeconds };
  }
}

export const cache = new CacheService();
