import { cacheGet, cacheSet } from '../redis/redis.service.js';
import { CACHE_CONFIGS } from '../redis/redis.config.js';
import type { Session, OnlineStatus, UserStatus, TypingState } from '../../types/redis.js';
import { RedisManager } from '../redis/redis.service.js';

export class SessionCacheService {
    async setSession(userId: string, data: unknown): Promise<void> {
        const key = userId;
        await cacheSet(key, data, CACHE_CONFIGS.session);
    }

    async getSession(userId: string): Promise<unknown | null> {
        const key = userId;
        return await cacheGet(key, CACHE_CONFIGS.session);
    }

    async setOnlineStatus(userId: string, status: 'online' | 'away' | 'offline'): Promise<void> {
        const key = userId;
        await cacheSet(key, { status, lastSeen: Date.now() }, CACHE_CONFIGS.online);
    }

    async getOnlineStatus(userId: string): Promise<{ status: 'online' | 'away' | 'offline'; lastSeen: number } | null> {
        const key = userId;
        return await cacheGet(key, CACHE_CONFIGS.online);
    }

    async setTypingState(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
        const key = `${conversationId}:${userId}`;
        await cacheSet(key, { isTyping, timestamp: Date.now() }, CACHE_CONFIGS.typing);
    }

    async getTypingState(conversationId: string): Promise<Record<string, boolean>> {
        const key = `${conversationId}:*`;
        const redis = await RedisManager.getInstance();
        const keys = await redis.keys(key);
        const typingStates: Record<string, boolean> = {};

        for (const key of keys) {
            const value = await cacheGet<{ isTyping: boolean; timestamp: number }>(key, CACHE_CONFIGS.typing);
            if (value?.isTyping && Date.now() - value.timestamp < CACHE_CONFIGS.typing.ttl * 1000) {
                const userId = key.split(':')[1];
                typingStates[userId] = true;
            }
        }

        return typingStates;
    }

    async updateSessionActivity(userId: string): Promise<void> {
        const session = await this.getSession(userId) as Session | null;
        if (session) {
            session.lastActive = new Date().toISOString();
            await cacheSet(userId, session, CACHE_CONFIGS.session);
        }
    }

    async updateUserStatus(userId: string, status: OnlineStatus): Promise<void> {
        const userStatus: UserStatus = {
            status,
            lastSeen: new Date().toISOString()
        };
        await cacheSet(userId, userStatus, CACHE_CONFIGS.online);
    }

    async getUserStatus(userId: string): Promise<UserStatus | null> {
        return await cacheGet<UserStatus>(userId, CACHE_CONFIGS.online);
    }

    async setTypingIndicator(
        userId: string,
        conversationId: string
    ): Promise<void> {
        const state: TypingState = {
            isTyping: true,
            timestamp: Date.now()
        };
        await cacheSet(
            `${userId}:${conversationId}`,
            state,
            CACHE_CONFIGS.typing
        );
    }

    async clearTypingIndicator(
        userId: string,
        conversationId: string
    ): Promise<void> {
        await cacheSet(
            `${userId}:${conversationId}`,
            { isTyping: false, timestamp: Date.now() },
            CACHE_CONFIGS.typing
        );
    }
} 