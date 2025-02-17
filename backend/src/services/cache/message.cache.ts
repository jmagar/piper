import type { ChatMessage } from '../../types/db.js';
import { CACHE_CONFIGS } from '../redis/redis.config.js';
import { cacheSet, cacheGet } from '../redis/redis.service.js';
import type { MessageCache } from '../../types/redis.js';

const MAX_CACHED_MESSAGES = 50;

export class MessageCacheService implements MessageCache {
    async cacheConversationMessages(
        conversationId: string,
        messages: ChatMessage[]
    ): Promise<void> {
        // Only cache the most recent messages
        const recentMessages = messages.slice(0, MAX_CACHED_MESSAGES);
        await cacheSet(
            conversationId,
            recentMessages,
            CACHE_CONFIGS.messages
        );
    }

    async getCachedMessages(
        conversationId: string
    ): Promise<ChatMessage[] | null> {
        const key = conversationId;
        return await cacheGet<ChatMessage[]>(
            key,
            CACHE_CONFIGS.messages
        );
    }
} 