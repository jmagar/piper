import { createClient } from 'redis';
import { broadcastLog } from '../../utils/logger.js';
import { REDIS_URL, CACHE_CONFIGS, CacheConfig } from './redis.config.js';
import type { ChatMessage } from '../../types/db.js';

// Redis Manager Class
export class RedisManager {
    private static instance: ReturnType<typeof createClient> | null = null;
    private constructor() {}

    public static async getInstance(): Promise<ReturnType<typeof createClient>> {
        if (!RedisManager.instance) {
            const client = createClient({
                url: REDIS_URL,
                socket: {
                    reconnectStrategy: (retries: number) => {
                        const delay = Math.min(retries * 50, 2000);
                        broadcastLog('info', `Retrying Redis connection in ${delay}ms...`);
                        return delay;
                    }
                },
                disableOfflineQueue: false,
                legacyMode: false
            });

            // Set up event handlers
            client.on('connect', () => broadcastLog('info', 'Connected to Redis'));
            client.on('error', (err) => broadcastLog('error', `Redis Error: ${err.message}`));
            client.on('reconnecting', () => broadcastLog('info', 'Reconnecting to Redis...'));
            client.on('end', () => broadcastLog('info', 'Redis connection ended'));

            // Connect to Redis
            await client.connect();
            RedisManager.instance = client;
        }

        return RedisManager.instance;
    }

    public static async cleanup(): Promise<void> {
        if (RedisManager.instance) {
            await RedisManager.instance.quit();
            RedisManager.instance = null;
            broadcastLog('info', 'Redis connection closed');
        }
    }
}

// Initialize Redis client
const redisClientPromise = RedisManager.getInstance();

// Cache Operations
export async function cacheSet<T>(
    key: string,
    value: T,
    config: CacheConfig
): Promise<void> {
    const redis = await redisClientPromise;
    const fullKey = `${config.prefix}${key}`;
    await redis.set(fullKey, JSON.stringify(value), { EX: config.ttl });
}

export async function cacheGet<T>(
    key: string,
    config: CacheConfig
): Promise<T | null> {
    const redis = await redisClientPromise;
    const fullKey = `${config.prefix}${key}`;
    const value = await redis.get(fullKey);
    return value ? JSON.parse(value) : null;
}

// Message Cache Operations
export async function cacheConversationMessages(
    conversationId: string,
    messages: ChatMessage[]
): Promise<void> {
    const key = `${CACHE_CONFIGS.messages.prefix}${conversationId}`;
    await cacheSet(key, messages, CACHE_CONFIGS.messages);
}

export async function getCachedMessages(
    conversationId: string
): Promise<ChatMessage[] | null> {
    const key = `${CACHE_CONFIGS.messages.prefix}${conversationId}`;
    return await cacheGet(key, CACHE_CONFIGS.messages);
}

// Tool Cache Operations
export async function cacheToolResult(
    toolName: string,
    input: string,
    result: unknown
): Promise<void> {
    const key = `${CACHE_CONFIGS.toolResults.prefix}${toolName}:${Buffer.from(input).toString('base64')}`;
    await cacheSet(key, result, CACHE_CONFIGS.toolResults);
}

export async function getCachedToolResult(
    toolName: string,
    input: string
): Promise<unknown | null> {
    const key = `${CACHE_CONFIGS.toolResults.prefix}${toolName}:${Buffer.from(input).toString('base64')}`;
    return await cacheGet(key, CACHE_CONFIGS.toolResults);
}

// Rate Limiting
export async function checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<boolean> {
    const redis = await redisClientPromise;
    const current = await redis.incr(key);
    
    if (current === 1) {
        await redis.expire(key, windowSeconds);
    }
    
    return current <= limit;
}

// Typing Indicators
export async function setTypingIndicator(
    userId: string,
    conversationId: string
): Promise<void> {
    const key = `${CACHE_CONFIGS.typing.prefix}${conversationId}:${userId}`;
    await cacheSet(key, { isTyping: true, timestamp: Date.now() }, CACHE_CONFIGS.typing);
}

export async function clearTypingIndicator(
    userId: string,
    conversationId: string
): Promise<void> {
    const key = `${CACHE_CONFIGS.typing.prefix}${conversationId}:${userId}`;
    await cacheSet(key, { isTyping: false, timestamp: Date.now() }, CACHE_CONFIGS.typing);
}

export async function getTypingUsers(
    conversationId: string
): Promise<string[]> {
    const redis = await redisClientPromise;
    const pattern = `${CACHE_CONFIGS.typing.prefix}${conversationId}:*`;
    const keys = await redis.keys(pattern);
    const typingUsers: string[] = [];

    for (const key of keys) {
        const value = await cacheGet<{ isTyping: boolean; timestamp: number }>(key, CACHE_CONFIGS.typing);
        if (value?.isTyping && Date.now() - value.timestamp < CACHE_CONFIGS.typing.ttl * 1000) {
            const userId = key.split(':')[2];
            typingUsers.push(userId);
        }
    }

    return typingUsers;
}

// User Status
export async function updateUserStatus(
    userId: string,
    status: 'online' | 'away' | 'offline'
): Promise<void> {
    const key = `${CACHE_CONFIGS.online.prefix}${userId}`;
    await cacheSet(key, { status, lastSeen: Date.now() }, CACHE_CONFIGS.online);
}

// Export cleanup function
export const cleanupRedis = RedisManager.cleanup; 