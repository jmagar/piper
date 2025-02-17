// Redis Configuration
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:7654';

// MECE Cache Configuration
export interface CacheConfig {
    ttl: number;  // Time to live in seconds
    prefix: string;
}

export const CACHE_CONFIGS = {
    conversation: {
        ttl: 3600,  // 1 hour
        prefix: 'conv:'
    },
    userPreferences: {
        ttl: 86400,  // 24 hours
        prefix: 'pref:'
    },
    rateLimit: {
        ttl: 60,    // 1 minute
        prefix: 'rate:'
    },
    typing: {
        ttl: 10,    // 10 seconds
        prefix: 'typing:'
    },
    session: {
        ttl: 86400, // 24 hours
        prefix: 'sess:'
    },
    online: {
        ttl: 300,   // 5 minutes
        prefix: 'online:'
    },
    messages: {
        ttl: 3600,  // 1 hour
        prefix: 'messages:'
    },
    toolResults: {
        ttl: 300,   // 5 minutes
        prefix: 'tool:'
    }
} as const;

// Redis Events Configuration
export type RedisEvent = {
    name: 'connect' | 'error' | 'reconnecting' | 'end';
    level: 'info' | 'error';
    getMessage: (err?: Error) => string;
};

export const REDIS_EVENTS: RedisEvent[] = [
    {
        name: 'connect',
        level: 'info',
        getMessage: () => 'Connected to Redis'
    },
    {
        name: 'error',
        level: 'error',
        getMessage: (err) => `Redis Error: ${err?.message || 'Unknown error'}`
    },
    {
        name: 'reconnecting',
        level: 'info',
        getMessage: () => 'Reconnecting to Redis...'
    },
    {
        name: 'end',
        level: 'info',
        getMessage: () => 'Redis connection ended'
    }
]; 