/**
 * Simple in-memory cache utility for API responses
 * Cache entries expire after a configurable TTL (time-to-live)
 */

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

class MemoryCache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private defaultTTL: number = 60 * 1000; // 60 seconds default

    /**
     * Get cached data or fetch fresh data
     * @param key - Cache key
     * @param fetcher - Function to fetch data if not cached
     * @param ttl - Time to live in milliseconds (default: 60 seconds)
     */
    async getOrFetch<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttl: number = this.defaultTTL
    ): Promise<T> {
        const cached = this.get<T>(key);
        if (cached !== null) {
            console.log(`[Cache] HIT: ${key}`);
            return cached;
        }

        console.log(`[Cache] MISS: ${key}`);
        const data = await fetcher();
        this.set(key, data, ttl);
        return data;
    }

    /**
     * Get cached data
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Set cached data
     */
    set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttl
        });
    }

    /**
     * Invalidate a specific cache entry
     */
    invalidate(key: string): void {
        this.cache.delete(key);
        console.log(`[Cache] INVALIDATED: ${key}`);
    }

    /**
     * Invalidate all cache entries matching a pattern
     */
    invalidatePattern(pattern: string): void {
        const regex = new RegExp(pattern);
        let count = 0;
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }
        console.log(`[Cache] INVALIDATED ${count} entries matching: ${pattern}`);
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear();
        console.log('[Cache] CLEARED all entries');
    }

    /**
     * Get cache stats
     */
    stats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Singleton instance
export const cache = new MemoryCache();

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
    SHORT: 30 * 1000,      // 30 seconds
    MEDIUM: 60 * 1000,     // 1 minute
    LONG: 5 * 60 * 1000,   // 5 minutes
    VERY_LONG: 30 * 60 * 1000, // 30 minutes
};

// Cache keys
export const CACHE_KEYS = {
    PROJECTS: 'projects:all',
    PROJECT: (id: string) => `projects:${id}`,
    DASHBOARD_SUMMARY: 'dashboard:summary',
    PHASES: 'phases:all',
    CLIENTS: 'clients:all',
};
