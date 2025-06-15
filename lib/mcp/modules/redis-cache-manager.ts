import Redis from 'ioredis';
import { appLogger } from '@/lib/logger';

// Enhance globalThis for HMR persistence in development
declare global {
  // eslint-disable-next-line no-var
  var __redisClientForMCP: Redis | undefined;
}

export interface CacheableServerInfo {
  key: string;
  label: string;
  status: string;
  tools: unknown[];
  errorDetails?: string;
  transportType: string;
}

const REDIS_CACHE_PREFIX = 'mcp_status:';
const REDIS_CACHE_EXPIRY_SECONDS = 300;

let redisClient: Redis | undefined;

export class RedisCacheManager {
  private static instance: RedisCacheManager;

  static getInstance(): RedisCacheManager {
    if (!RedisCacheManager.instance) {
      RedisCacheManager.instance = new RedisCacheManager();
    }
    return RedisCacheManager.instance;
  }

  getClient(): Redis | undefined {
    // If already initialized (either by this function previously or HMR in dev), return it
    if (redisClient) {
      return redisClient;
    }
    
    // For development HMR, if globalThis has it, use it and assign to module scope
    if (process.env.NODE_ENV !== 'production' && globalThis.__redisClientForMCP) {
      appLogger.logSource('MCP', 'info', '[Redis Cache Manager] Using existing Redis client from globalThis (HMR).');
      redisClient = globalThis.__redisClientForMCP;
      return redisClient;
    }

    // Proceed with new initialization
    if (!process.env.REDIS_URL) {
      appLogger.logSource('MCP', 'warn', '[Redis Cache Manager] REDIS_URL environment variable is not set. Redis client will not be initialized. Caching will be disabled.');
      return undefined;
    }

    try {
      appLogger.logSource('MCP', 'info', `[Redis Cache Manager] Initializing new Redis client for ${process.env.NODE_ENV} mode. URL: ${process.env.REDIS_URL}`);
      const newClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        connectTimeout: 5000, // 5 seconds
        // Keep offline queue enabled by default, so commands queue if not connected yet.
        // Disable it if commands should fail fast when disconnected: enableOfflineQueue: false
      });

      newClient.on('error', (err) => appLogger.logSource('MCP', 'error', '[Redis Cache Manager] Redis Client Error:', err.message || err));
      newClient.on('connect', () => appLogger.logSource('MCP', 'info', '[Redis Cache Manager] Redis Client Connected.'));
      newClient.on('ready', () => appLogger.logSource('MCP', 'info', '[Redis Cache Manager] Redis Client Ready.'));
      newClient.on('reconnecting', () => appLogger.logSource('MCP', 'info', '[Redis Cache Manager] Redis Client Reconnecting...'));
      
      redisClient = newClient; // Assign to module-scoped variable

      if (process.env.NODE_ENV !== 'production') {
        globalThis.__redisClientForMCP = newClient; // Assign to global for HMR
        appLogger.logSource('MCP', 'info', '[Redis Cache Manager] Development Redis client stored on globalThis.__redisClientForMCP.');
      }
      return redisClient;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      appLogger.logSource('MCP', 'error', `[Redis Cache Manager] Failed to initialize Redis client: ${errorMessage}`);
      if (errorMessage.includes('ENOTFOUND')) {
        appLogger.logSource('MCP', 'warn', `[Redis Cache Manager] Redis host not found (ENOTFOUND). This is common during build if service isn't up. Caching will be unavailable.`);
      }
      return undefined;
    }
  }

  async setServerStatus(serverKey: string, serverInfo: CacheableServerInfo): Promise<void> {
    const client = this.getClient();
    if (!client) {
      appLogger.logSource('MCP', 'warn', `[Redis Cache Manager] Redis client not available. Cannot cache status for ${serverInfo.label}.`);
      return;
    }

    try {
      await client.set(
        `${REDIS_CACHE_PREFIX}${serverKey}`, 
        JSON.stringify(serverInfo), 
        'EX', 
        REDIS_CACHE_EXPIRY_SECONDS
      );
    } catch (error: unknown) {
      appLogger.logSource('MCP', 'error', `[Redis Cache Manager] Error setting cache for ${serverInfo.label}:`, error instanceof Error ? error.message : String(error));
    }
  }

  async getServerStatus(serverKey: string): Promise<CacheableServerInfo | null> {
    const client = this.getClient();
    if (!client) {
      return null;
    }

    try {
      const data = await client.get(`${REDIS_CACHE_PREFIX}${serverKey}`);
      if (data) {
        return JSON.parse(data) as CacheableServerInfo;
      }
    } catch (error: unknown) {
      appLogger.logSource('MCP', 'error', `[Redis Cache Manager] Error getting cache for ${serverKey}:`, error instanceof Error ? error.message : String(error));
    }
    
    return null;
  }

  async getMultipleServerStatuses(serverKeys: string[]): Promise<(CacheableServerInfo | null)[]> {
    const client = this.getClient();
    if (!client || serverKeys.length === 0) {
      return [];
    }

    try {
      const redisKeys = serverKeys.map(key => `${REDIS_CACHE_PREFIX}${key}`);
      const cachedData = await client.mget(redisKeys);
      
      return cachedData.map((data, index) => {
        if (data) {
          try {
            return JSON.parse(data) as CacheableServerInfo;
          } catch (error: unknown) {
            appLogger.logSource('MCP', 'error', `[Redis Cache Manager] Error parsing cached data for ${serverKeys[index]}:`, error instanceof Error ? error.message : String(error));
            return null;
          }
        }
        return null;
      });
    } catch (error: unknown) {
      appLogger.logSource('MCP', 'error', `[Redis Cache Manager] Error getting multiple server statuses:`, error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  async deleteServerStatus(serverKey: string): Promise<void> {
    const client = this.getClient();
    if (!client) {
      return;
    }

    try {
      await client.del(`${REDIS_CACHE_PREFIX}${serverKey}`);
    } catch (error: unknown) {
      appLogger.logSource('MCP', 'error', `[Redis Cache Manager] Error deleting cache for ${serverKey}:`, error instanceof Error ? error.message : String(error));
    }
  }

  async clearAllServerStatuses(): Promise<void> {
    const client = this.getClient();
    if (!client) {
      return;
    }

    try {
      const keys = await client.keys(`${REDIS_CACHE_PREFIX}*`);
      if (keys.length > 0) {
        await client.del(...keys);
        appLogger.logSource('MCP', 'info', `[Redis Cache Manager] Cleared ${keys.length} cached server statuses.`);
      }
    } catch (error: unknown) {
      appLogger.logSource('MCP', 'error', `[Redis Cache Manager] Error clearing all server statuses:`, error instanceof Error ? error.message : String(error));
    }
  }

  isAvailable(): boolean {
    return this.getClient() !== undefined;
  }
}

// Export singleton instance
export const redisCacheManager = RedisCacheManager.getInstance(); 