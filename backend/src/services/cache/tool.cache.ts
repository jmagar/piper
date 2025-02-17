import { cacheGet, cacheSet } from '../redis/redis.service.js';
import { CACHE_CONFIGS } from '../redis/redis.config.js';
import type { ToolCache } from '../../types/redis.js';

export class ToolCacheService implements ToolCache {
    async cacheToolResult(
        toolName: string,
        input: string,
        result: unknown
    ): Promise<void> {
        const key = `${toolName}:${Buffer.from(input).toString('base64')}`;
        await cacheSet(key, result, CACHE_CONFIGS.toolResults);
    }

    async getCachedToolResult(
        toolName: string,
        input: string
    ): Promise<unknown | null> {
        const key = `${toolName}:${Buffer.from(input).toString('base64')}`;
        return await cacheGet(key, CACHE_CONFIGS.toolResults);
    }
} 