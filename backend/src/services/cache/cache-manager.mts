import { createClient } from 'redis';
import debug from 'debug';

const log = debug('cache:manager');
const error = debug('cache:manager:error');

/**
 * Cache TTL values in seconds
 */
export enum CacheTTL {
  SHORT = 300, // 5 minutes
  MEDIUM = 3600, // 1 hour
  LONG = 86400, // 1 day
  VERY_LONG = 604800, // 1 week
}

/**
 * Redis-based cache manager for application-wide caching
 */
export class CacheManager {
  private client: ReturnType<typeof createClient>;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379') {
    log('Initializing cache manager with Redis URL: %s', this.maskRedisUrl(redisUrl));
    
    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          const delay = Math.min(retries * 50, 1000);
          log('Redis reconnect attempt %d, delay: %d ms', retries, delay);
          return delay;
        }
      }
    });

    this.setupEventListeners();
    this.connect();
  }

  /**
   * Set up event listeners for the Redis client
   */
  private setupEventListeners() {
    this.client.on('error', (err) => {
      error('Redis client error: %s', err.message);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      log('Connected to Redis');
      this.isConnected = true;
    });

    this.client.on('reconnecting', () => {
      log('Reconnecting to Redis...');
      this.isConnected = false;
    });

    this.client.on('end', () => {
      log('Redis connection closed');
      this.isConnected = false;
    });
  }

  /**
   * Connect to Redis
   * @returns Promise that resolves when connected
   */
  private async connect(): Promise<void> {
    if (this.isConnected) return;
    
    if (!this.connectionPromise) {
      this.connectionPromise = (async () => {
        try {
          log('Connecting to Redis...');
          await this.client.connect();
          log('Redis connection established');
          this.isConnected = true;
        } catch (err) {
          error('Failed to connect to Redis: %s', err instanceof Error ? err.message : String(err));
          this.isConnected = false;
          throw err;
        } finally {
          this.connectionPromise = null;
        }
      })();
    }
    
    return this.connectionPromise;
  }

  /**
   * Ensure a connection to Redis exists before performing operations
   */
  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Value if found, null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      await this.ensureConnection();
      const value = await this.client.get(key);
      
      if (!value) {
        log('Cache miss for key: %s', key);
        return null;
      }
      
      log('Cache hit for key: %s', key);
      return JSON.parse(value) as T;
    } catch (err) {
      error('Error getting cache key %s: %s', key, err instanceof Error ? err.message : String(err));
      return null;
    }
  }

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl TTL in seconds
   * @returns True if successful, false otherwise
   */
  async set(key: string, value: unknown, ttl: number = CacheTTL.MEDIUM): Promise<boolean> {
    try {
      await this.ensureConnection();
      const serializedValue = JSON.stringify(value);
      await this.client.set(key, serializedValue, { EX: ttl });
      log('Cached key %s with TTL %d seconds', key, ttl);
      return true;
    } catch (err) {
      error('Error setting cache key %s: %s', key, err instanceof Error ? err.message : String(err));
      return false;
    }
  }

  /**
   * Delete a value from cache
   * @param key Cache key
   * @returns True if successful, false otherwise
   */
  async del(key: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      await this.client.del(key);
      log('Deleted cache key: %s', key);
      return true;
    } catch (err) {
      error('Error deleting cache key %s: %s', key, err instanceof Error ? err.message : String(err));
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * @param pattern Pattern to match (e.g., "user:*")
   * @returns Number of keys deleted
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      await this.ensureConnection();
      
      // Scan for keys matching pattern
      const keys: string[] = [];
      let cursor = 0;
      
      do {
        const result = await this.client.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = result.cursor;
        keys.push(...result.keys);
      } while (cursor !== 0);
      
      if (keys.length === 0) {
        log('No keys found matching pattern: %s', pattern);
        return 0;
      }
      
      // Delete all matching keys
      const deletedCount = await this.client.del(keys);
      log('Deleted %d keys matching pattern: %s', deletedCount, pattern);
      return deletedCount;
    } catch (err) {
      error('Error deleting keys matching pattern %s: %s', pattern, err instanceof Error ? err.message : String(err));
      return 0;
    }
  }

  /**
   * Check if a key exists in cache
   * @param key Cache key
   * @returns True if key exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (err) {
      error('Error checking if key %s exists: %s', key, err instanceof Error ? err.message : String(err));
      return false;
    }
  }
  
  /**
   * Clear the entire cache (use with caution!)
   * @returns True if successful, false otherwise
   */
  async flushAll(): Promise<boolean> {
    try {
      await this.ensureConnection();
      await this.client.flushAll();
      log('Flushed entire cache');
      return true;
    } catch (err) {
      error('Error flushing cache: %s', err instanceof Error ? err.message : String(err));
      return false;
    }
  }
  
  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
        log('Redis connection closed');
      }
    } catch (err) {
      error('Error closing Redis connection: %s', err instanceof Error ? err.message : String(err));
    }
  }
  
  /**
   * Mask Redis URL for logging (hide password)
   */
  private maskRedisUrl(redisUrl: string): string {
    try {
      const url = new URL(redisUrl);
      if (url.password) {
        return redisUrl.replace(url.password, '******');
      }
      return redisUrl;
    } catch {
      return redisUrl;
    }
  }
}

// Export a singleton instance of the cache manager
export const cacheManager = new CacheManager(); 