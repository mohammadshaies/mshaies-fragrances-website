/**
 * High-Performance In-Memory Server Cache with Stale-While-Revalidate & Tag Invalidation
 * Designed for M.shaies Haute Parfumerie (Nitro / TanStack Start SSR)
 */

type CacheEntry<T = any> = {
  value: T;
  createdAt: number;
  expiresAt: number;
  staleUntil: number;
  tags: string[];
};

type CacheStats = {
  hits: number;
  misses: number;
  staleHits: number;
  writes: number;
  purges: number;
  totalKeys: number;
  hitRatio: number;
  keys: Array<{ key: string; expiresAt: string; tags: string[] }>;
  lastPurgedAt: string | null;
};

class ServerCache {
  private cache = new Map<string, CacheEntry>();
  private inFlight = new Map<string, Promise<any>>();
  private hits = 0;
  private misses = 0;
  private staleHits = 0;
  private writes = 0;
  private purges = 0;
  private lastPurgedAt: number | null = null;

  /**
   * Fetch from cache or execute fetcher with stampede (dog-piling) protection.
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = 300, // 5 minutes default
    tags: string[] = [],
    staleGraceSeconds = 120 // 2 minutes stale grace period
  ): Promise<T> {
    const now = Date.now();
    const entry = this.cache.get(key);

    // 1. Fresh Cache Hit
    if (entry && entry.expiresAt > now) {
      this.hits++;
      return entry.value as T;
    }

    // 2. Stale Cache Hit with Background Revalidation
    if (entry && entry.staleUntil > now) {
      this.staleHits++;
      // Trigger background revalidation if not already in-flight
      if (!this.inFlight.has(key)) {
        const revalidatePromise = fetcher()
          .then((freshValue) => {
            this.set(key, freshValue, ttlSeconds, tags, staleGraceSeconds);
            return freshValue;
          })
          .catch((err) => {
            console.warn(`[ServerCache] Background revalidation failed for ${key}:`, err);
          })
          .finally(() => {
            this.inFlight.delete(key);
          });
        this.inFlight.set(key, revalidatePromise);
      }
      return entry.value as T;
    }

    // 3. Cache Miss - In-flight deduplication (Stampede Protection)
    this.misses++;
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key) as Promise<T>;
    }

    const fetchPromise = (async () => {
      try {
        const result = await fetcher();
        this.set(key, result, ttlSeconds, tags, staleGraceSeconds);
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Set a cache entry manually.
   */
  set<T>(
    key: string,
    value: T,
    ttlSeconds = 300,
    tags: string[] = [],
    staleGraceSeconds = 120
  ): void {
    const now = Date.now();
    this.cache.set(key, {
      value,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
      staleUntil: now + (ttlSeconds + staleGraceSeconds) * 1000,
      tags,
    });
    this.writes++;
  }

  /**
   * Read raw cache entry without triggering fetcher.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      return null;
    }
    this.hits++;
    return entry.value as T;
  }

  /**
   * Invalidate all keys matching any of the provided tags.
   */
  invalidateTags(...tags: string[]): number {
    let count = 0;
    const tagSet = new Set(tags);
    for (const [key, entry] of this.cache.entries()) {
      const hasMatchingTag = entry.tags.some((t) => tagSet.has(t));
      const hasMatchingKeyPrefix = Array.from(tagSet).some((t) => key.startsWith(t + ":") || key === t || key.includes(t));
      if (hasMatchingTag || hasMatchingKeyPrefix) {
        this.cache.delete(key);
        count++;
      }
    }
    this.inFlight.clear();
    this.purges++;
    this.lastPurgedAt = Date.now();
    return count;
  }

  /**
   * Invalidate a single key.
   */
  invalidateKey(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.inFlight.delete(key);
    if (deleted) {
      this.purges++;
      this.lastPurgedAt = Date.now();
    }
    return deleted;
  }

  /**
   * Purge the entire cache.
   */
  purgeAll(): void {
    this.cache.clear();
    this.inFlight.clear();
    this.purges++;
    this.lastPurgedAt = Date.now();
  }

  /**
   * Get telemetry and diagnostics for admin dashboard.
   */
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses + this.staleHits;
    const hitRatio = totalRequests > 0 ? ((this.hits + this.staleHits) / totalRequests) * 100 : 100;

    const keys: Array<{ key: string; expiresAt: string; tags: string[] }> = [];
    for (const [key, entry] of this.cache.entries()) {
      keys.push({
        key,
        expiresAt: new Date(entry.expiresAt).toISOString(),
        tags: entry.tags,
      });
    }

    return {
      hits: this.hits,
      misses: this.misses,
      staleHits: this.staleHits,
      writes: this.writes,
      purges: this.purges,
      totalKeys: this.cache.size,
      hitRatio: Math.round(hitRatio * 10) / 10,
      keys,
      lastPurgedAt: this.lastPurgedAt ? new Date(this.lastPurgedAt).toISOString() : null,
    };
  }
}

// Global singleton instance preserved across SSR invocations
declare global {
  // eslint-disable-next-line no-var
  var __mshaies_server_cache: ServerCache | undefined;
}

export const serverCache: ServerCache =
  globalThis.__mshaies_server_cache || (globalThis.__mshaies_server_cache = new ServerCache());
