import Redis from 'ioredis';
import { appLogger } from '@/lib/logger';
import { LogLevel } from '@/lib/logger/constants';

// Enhance globalThis for HMR persistence in development
declare global {
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
      appLogger.logSource('MCP', LogLevel.INFO, '[Redis Cache Manager] Using existing Redis client from globalThis (HMR).');
      redisClient = globalThis.__redisClientForMCP;
      return redisClient;
    }

    // Proceed with new initialization
    if (!process.env.REDIS_URL) {
      appLogger.logSource('MCP', LogLevel.WARN, '[Redis Cache Manager] REDIS_URL environment variable is not set. Redis client will not be initialized. Caching will be disabled.');
      return undefined;
    }

    try {
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache Manager] Initializing new Redis client for ${process.env.NODE_ENV} mode. URL: ${process.env.REDIS_URL}`);
      const newClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        connectTimeout: 5000, // 5 seconds
        // Keep offline queue enabled by default, so commands queue if not connected yet.
        // Disable it if commands should fail fast when disconnected: enableOfflineQueue: false
      });

      newClient.on('error', (err) => appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache Manager] Redis Client Error: ${err.message || err}`));
      newClient.on('connect', () => appLogger.logSource('MCP', LogLevel.INFO, '[Redis Cache Manager] Redis Client Connected.'));
      newClient.on('ready', () => appLogger.logSource('MCP', LogLevel.INFO, '[Redis Cache Manager] Redis Client Ready.'));
      newClient.on('reconnecting', () => appLogger.logSource('MCP', LogLevel.INFO, '[Redis Cache Manager] Redis Client Reconnecting...'));
      
      redisClient = newClient; // Assign to module-scoped variable

      if (process.env.NODE_ENV !== 'production') {
        globalThis.__redisClientForMCP = newClient; // Assign to global for HMR
        appLogger.logSource('MCP', LogLevel.INFO, '[Redis Cache Manager] Development Redis client stored on globalThis.__redisClientForMCP.');
      }
      return redisClient;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache Manager] Failed to initialize Redis client: ${errorMessage}`);
      if (errorMessage.includes('ENOTFOUND')) {
        appLogger.logSource('MCP', LogLevel.WARN, `[Redis Cache Manager] Redis host not found (ENOTFOUND). This is common during build if service isn't up. Caching will be unavailable.`);
      }
      return undefined;
    }
  }

  async setServerStatus(serverKey: string, serverInfo: CacheableServerInfo): Promise<void> {
    const client = this.getClient();
    if (!client) {
      appLogger.logSource('MCP', LogLevel.WARN, `[Redis Cache Manager] Redis client not available. Cannot cache status for ${serverInfo.label}.`);
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
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache Manager] Error setting cache for ${serverInfo.label}: ${error instanceof Error ? error.message : String(error)}`);
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
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache Manager] Error getting cache for ${serverKey}: ${error instanceof Error ? error.message : String(error)}`);
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
            appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache Manager] Error parsing cached data for ${serverKeys[index]}: ${error instanceof Error ? error.message : String(error)}`);
            return null;
          }
        }
        return null;
      });
    } catch (error: unknown) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache Manager] Error getting multiple server statuses: ${error instanceof Error ? error.message : String(error)}`);
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
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache Manager] Error deleting cache for ${serverKey}: ${error instanceof Error ? error.message : String(error)}`);
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
        appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache Manager] Cleared ${keys.length} cached server statuses.`);
      }
    } catch (error: unknown) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache Manager] Error clearing all server statuses: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  isAvailable(): boolean {
    return this.getClient() !== undefined;
  }

  // =============================================================================
  // TOKEN OPTIMIZATION CACHING METHODS
  // =============================================================================

  /**
   * System Prompt Caching - HIGH IMPACT
   * Cache context-aware system prompts to avoid regenerating them
   */
  async getSystemPrompt(contextHash: string): Promise<string | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const cached = await client.get(`system_prompt:${contextHash}`);
      if (cached) {
        appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] System prompt cache HIT for context: ${contextHash.substring(0, 8)}...`);
        return cached;
      }
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] System prompt cache MISS for context: ${contextHash.substring(0, 8)}...`);
      return null;
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error getting system prompt: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async setSystemPrompt(contextHash: string, prompt: string, ttl: number = 600): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.setex(`system_prompt:${contextHash}`, ttl, prompt);
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Cached system prompt for context: ${contextHash.substring(0, 8)}... (TTL: ${ttl}s)`);
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error caching system prompt: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Tool Selection Caching - MASSIVE IMPACT
   * Cache context-aware tool selections to avoid loading all tools
   */
  async getToolSelection(contextHash: string): Promise<Record<string, unknown> | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const cached = await client.get(`tool_selection:${contextHash}`);
      if (cached) {
        appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Tool selection cache HIT for context: ${contextHash.substring(0, 8)}...`);
        return JSON.parse(cached);
      }
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Tool selection cache MISS for context: ${contextHash.substring(0, 8)}...`);
      return null;
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error getting tool selection: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async setToolSelection(contextHash: string, tools: Record<string, unknown>, ttl: number = 300): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.setex(`tool_selection:${contextHash}`, ttl, JSON.stringify(tools));
      const toolCount = Object.keys(tools).length;
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Cached tool selection: ${toolCount} tools for context: ${contextHash.substring(0, 8)}... (TTL: ${ttl}s)`);
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error caching tool selection: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Agent Configuration Caching - HIGH IMPACT
   * Cache agent configs to reduce database queries
   */
  async getAgentConfig(agentId: string): Promise<Record<string, unknown> | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const cached = await client.get(`agent:${agentId}`);
      if (cached) {
        appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Agent config cache HIT for: ${agentId}`);
        return JSON.parse(cached);
      }
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Agent config cache MISS for: ${agentId}`);
      return null;
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error getting agent config: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async setAgentConfig(agentId: string, config: Record<string, unknown>, ttl: number = 600): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.setex(`agent:${agentId}`, ttl, JSON.stringify(config));
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Cached agent config for: ${agentId} (TTL: ${ttl}s)`);
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error caching agent config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Token Count Caching - HIGH IMPACT
   * Cache expensive tiktoken calculations
   */
  async getTokenCount(contentHash: string): Promise<number | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const cached = await client.get(`token_count:${contentHash}`);
      if (cached) {
        const count = parseInt(cached, 10);
        if (!isNaN(count)) {
          appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Token count cache HIT: ${count} tokens`);
          return count;
        }
      }
      return null;
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error getting token count: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async setTokenCount(contentHash: string, count: number, ttl: number = 1800): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.setex(`token_count:${contentHash}`, ttl, count.toString());
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Cached token count: ${count} tokens (TTL: ${ttl}s)`);
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error caching token count: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Message Transform Caching - HIGH IMPACT
   * Cache expensive message transformation results
   */
  async getMessageTransform(messagesHash: string): Promise<unknown[] | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const cached = await client.get(`msg_transform:${messagesHash}`);
      if (cached) {
        appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Message transform cache HIT for: ${messagesHash.substring(0, 8)}...`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error getting message transform: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async setMessageTransform(messagesHash: string, transformedMessages: unknown[], ttl: number = 900): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.setex(`msg_transform:${messagesHash}`, ttl, JSON.stringify(transformedMessages));
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Cached message transform: ${transformedMessages.length} messages (TTL: ${ttl}s)`);
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error caching message transform: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Model Configuration Caching - MEDIUM IMPACT
   * Cache OpenRouter models and local model configs to eliminate file I/O
   */
  async getCachedOpenRouterModels(): Promise<unknown[] | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const cached = await client.get('openrouter_models');
      if (cached) {
        appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] OpenRouter models cache HIT`);
        return JSON.parse(cached);
      }
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] OpenRouter models cache MISS`);
      return null;
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error getting OpenRouter models: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async setCachedOpenRouterModels(models: unknown[], ttl: number = 3600): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.setex('openrouter_models', ttl, JSON.stringify(models));
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Cached OpenRouter models: ${models.length} models (TTL: ${ttl}s)`);
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error caching OpenRouter models: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getCachedModelConfigs(): Promise<unknown[] | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const cached = await client.get('model_configs');
      if (cached) {
        appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Model configs cache HIT`);
        return JSON.parse(cached);
      }
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Model configs cache MISS`);
      return null;
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error getting model configs: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async setCachedModelConfigs(models: unknown[], ttl: number = 24 * 60 * 60): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.setex('model_configs', ttl, JSON.stringify(models));
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Cached model configs: ${models.length} models (TTL: ${ttl}s)`);
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error caching model configs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Configuration File Caching - MEDIUM IMPACT
   * Cache config.json contents to eliminate file I/O on every config access
   * Uses 1-hour TTL with automatic invalidation on writes
   */
  async getCachedConfigFile(configPath: string): Promise<unknown | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const cacheKey = `config_file:${configPath.replace(/[/\\]/g, '_')}`;
      const cached = await client.get(cacheKey);
      if (cached) {
        appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Config file cache HIT for: ${configPath}`);
        return JSON.parse(cached);
      }
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Config file cache MISS for: ${configPath}`);
      return null;
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error getting cached config file: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async setCachedConfigFile(configPath: string, config: unknown, ttl: number = 300): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      const cacheKey = `config_file:${configPath.replace(/[/\\]/g, '_')}`;
      await client.setex(cacheKey, ttl, JSON.stringify(config));
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Cached config file: ${configPath} (TTL: ${ttl}s)`);
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error caching config file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async invalidateCachedConfigFile(configPath: string): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      const cacheKey = `config_file:${configPath.replace(/[/\\]/g, '_')}`;
      await client.del(cacheKey);
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Invalidated config file cache: ${configPath}`);
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error invalidating config file cache: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Processed Mention Caching - MEDIUM IMPACT
   * Cache processed file, URL, and prompt mention results to avoid repeated processing
   */

  // File Mention Caching (1-hour TTL)
  async getCachedFileProcessing(filePathHash: string): Promise<{ contentType: string; name: string; url: string; }[] | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const cached = await client.get(`file_processing:${filePathHash}`);
      if (cached) {
        appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] File processing cache HIT for: ${filePathHash.substring(0, 8)}...`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error getting cached file processing: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async setCachedFileProcessing(filePathHash: string, attachments: { contentType: string; name: string; url: string; }[], ttl: number = 3600): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.setex(`file_processing:${filePathHash}`, ttl, JSON.stringify(attachments));
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Cached file processing: ${attachments.length} attachments (TTL: ${ttl}s)`);
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error caching file processing: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // URL Content Caching (30-minute TTL with time buckets)
  async getCachedUrlContent(urlContentHash: string): Promise<string | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const cached = await client.get(`url_content:${urlContentHash}`);
      if (cached) {
        appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] URL content cache HIT for: ${urlContentHash.substring(0, 8)}...`);
        return cached;
      }
      return null;
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error getting cached URL content: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async setCachedUrlContent(urlContentHash: string, content: string, ttl: number = 1800): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.setex(`url_content:${urlContentHash}`, ttl, content);
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Cached URL content: ${content.length} chars (TTL: ${ttl}s)`);
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error caching URL content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Prompt Content Caching (10-minute TTL)
  async getCachedPromptContent(promptHash: string): Promise<{ enhancedSystemPrompt: string; processedPrompts: { id: string; name: string; system_prompt: string | null; }[]; } | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const cached = await client.get(`prompt_content:${promptHash}`);
      if (cached) {
        appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Prompt content cache HIT for: ${promptHash.substring(0, 8)}...`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error getting cached prompt content: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async setCachedPromptContent(
    promptHash: string, 
    enhancedSystemPrompt: string, 
    processedPrompts: { id: string; name: string; system_prompt: string | null; }[], 
    ttl: number = 600
  ): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      const data = { enhancedSystemPrompt, processedPrompts };
      await client.setex(`prompt_content:${promptHash}`, ttl, JSON.stringify(data));
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Cached prompt content: ${processedPrompts.length} prompts (TTL: ${ttl}s)`);
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error caching prompt content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // =============================================================================
  // VALIDATION RESULT CACHING METHODS
  // =============================================================================

  /**
   * Validation Result Caching - LOW-MEDIUM IMPACT
   * Cache validation results to reduce redundant validation processing
   */
  
  // Config Validation Caching (15-minute TTL)
  async getCachedConfigValidation(configHash: string): Promise<{ valid: boolean; errors?: string[]; zodErrors?: unknown; processedAt: number; validationTime: number } | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const cached = await client.get(`validation_config:${configHash}`);
      if (cached) {
        appLogger.logSource('MCP', LogLevel.DEBUG, `[Redis Cache] Config validation cache HIT for: ${configHash.substring(0, 8)}...`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error getting cached config validation: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async setCachedConfigValidation(configHash: string, result: { valid: boolean; errors?: string[]; zodErrors?: unknown; processedAt: number; validationTime: number }, ttl: number = 7200): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.setex(`validation_config:${configHash}`, ttl, JSON.stringify(result));
      appLogger.logSource('MCP', LogLevel.DEBUG, `[Redis Cache] Cached config validation result: ${result.valid ? 'valid' : 'invalid'} (${result.validationTime}ms, TTL: ${ttl}s)`);
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error caching config validation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Schema Validation Caching (1-hour TTL)
  async getCachedSchemaValidation(schemaHash: string): Promise<{ valid: boolean; errors?: string[]; zodErrors?: unknown; processedAt: number; validationTime: number } | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const cached = await client.get(`validation_schema:${schemaHash}`);
      if (cached) {
        appLogger.logSource('MCP', LogLevel.DEBUG, `[Redis Cache] Schema validation cache HIT for: ${schemaHash.substring(0, 8)}...`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error getting cached schema validation: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async setCachedSchemaValidation(schemaHash: string, result: { valid: boolean; errors?: string[]; zodErrors?: unknown; processedAt: number; validationTime: number }, ttl: number = 3600): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.setex(`validation_schema:${schemaHash}`, ttl, JSON.stringify(result));
      appLogger.logSource('MCP', LogLevel.DEBUG, `[Redis Cache] Cached schema validation result: ${result.valid ? 'valid' : 'invalid'} (${result.validationTime}ms, TTL: ${ttl}s)`);
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error caching schema validation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Form Validation Caching (5-minute TTL)
  async getCachedFormValidation(formHash: string): Promise<{ valid: boolean; errors?: string[]; fieldErrors?: Record<string, string[]>; processedAt: number; validationTime: number } | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const cached = await client.get(`validation_form:${formHash}`);
      if (cached) {
        appLogger.logSource('MCP', LogLevel.DEBUG, `[Redis Cache] Form validation cache HIT for: ${formHash.substring(0, 8)}...`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error getting cached form validation: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async setCachedFormValidation(formHash: string, result: { valid: boolean; errors?: string[]; fieldErrors?: Record<string, string[]>; processedAt: number; validationTime: number }, ttl: number = 300): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.setex(`validation_form:${formHash}`, ttl, JSON.stringify(result));
      appLogger.logSource('MCP', LogLevel.DEBUG, `[Redis Cache] Cached form validation result: ${result.valid ? 'valid' : 'invalid'} (${result.validationTime}ms, TTL: ${ttl}s)`);
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error caching form validation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clear optimization caches (for debugging or cache invalidation)
   */
  async clearOptimizationCaches(): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      const patterns = [
        'system_prompt:*',
        'tool_selection:*', 
        'agent:*',
        'token_count:*',
        'msg_transform:*',
        'openrouter_models',
        'model_configs',
        'config_file:*',
        'file_processing:*',
        'url_content:*',
        'prompt_content:*',
        'validation_config:*',
        'validation_schema:*',
        'validation_form:*',
        'health_check:*'
      ];

      for (const pattern of patterns) {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          await client.del(...keys);
          appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Cleared ${keys.length} keys for pattern: ${pattern}`);
        }
      }
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error clearing optimization caches: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // =============================================================================
  // HEALTH CHECK CACHING METHODS
  // =============================================================================

  /**
   * Health Check Caching - MEDIUM IMPACT
   * Cache health check results to reduce redundant server calls
   */
  async getHealthCheckResult(serverKey: string): Promise<{ isHealthy: boolean; timestamp: number } | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const cached = await client.get(`health_check:${serverKey}`);
      if (cached) {
        const result = JSON.parse(cached);
        appLogger.logSource('MCP', LogLevel.DEBUG, `[Redis Cache] Health check cache HIT for: ${serverKey}`);
        return result;
      }
      appLogger.logSource('MCP', LogLevel.DEBUG, `[Redis Cache] Health check cache MISS for: ${serverKey}`);
      return null;
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error getting health check result: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async setHealthCheckResult(serverKey: string, isHealthy: boolean, ttl: number = 120): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      const result = { isHealthy, timestamp: Date.now() };
      await client.setex(`health_check:${serverKey}`, ttl, JSON.stringify(result));
      appLogger.logSource('MCP', LogLevel.DEBUG, `[Redis Cache] Cached health check result for: ${serverKey} (healthy: ${isHealthy}, TTL: ${ttl}s)`);
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error caching health check result: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get multiple health check results efficiently
   */
  async getMultipleHealthCheckResults(serverKeys: string[]): Promise<(({ isHealthy: boolean; timestamp: number } | null))[]> {
    const client = this.getClient();
    if (!client || serverKeys.length === 0) return [];

    try {
      const redisKeys = serverKeys.map(key => `health_check:${key}`);
      const cachedData = await client.mget(redisKeys);
      
      return cachedData.map((data, index) => {
        if (data) {
          try {
            return JSON.parse(data);
          } catch (error) {
            appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error parsing health check data for ${serverKeys[index]}: ${error instanceof Error ? error.message : String(error)}`);
            return null;
          }
        }
        return null;
      });
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error getting multiple health check results: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Clear health check cache for a specific server (useful when forcing re-check)
   */
  async clearHealthCheckResult(serverKey: string): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.del(`health_check:${serverKey}`);
      appLogger.logSource('MCP', LogLevel.INFO, `[Redis Cache] Cleared health check cache for: ${serverKey}`);
    } catch (error) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Redis Cache] Error clearing health check cache: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Export singleton instance
export const redisCacheManager = RedisCacheManager.getInstance(); 