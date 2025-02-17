import { Redis, RedisOptions } from 'ioredis';
import { broadcastLog } from '../utils/logger.js';

const redisConfig: RedisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    connectTimeout: 10000,
    enableAutoPipelining: true,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null,
    enableOfflineQueue: false,
    enableReadyCheck: false,
    lazyConnect: false,
    showFriendlyErrorStack: true,
    keyPrefix: '',
    commandTimeout: 10000,
    autoResubscribe: false,
    readOnly: false,
    stringNumbers: true
};

export const redis = new Redis(redisConfig);

// Add error handling
redis.on('error', (err) => {
    broadcastLog('error', `Redis error: ${err.message}`);
});

redis.on('connect', () => {
    broadcastLog('info', 'Redis connected successfully');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    await redis.quit();
});