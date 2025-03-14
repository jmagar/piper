import { cacheManager, CacheTTL } from '../cache/cache-manager.mjs';
import debug from 'debug';
import * as crypto from 'crypto';

const log = debug('chat:cache');
const error = debug('chat:cache:error');

/**
 * Chat cache service for handling cache operations related to chat functionality
 * Provides caching for messages, conversations, and user data
 */
export class ChatCacheService {
  // Cache key patterns
  private static readonly CONVERSATION_KEY = 'conv:';
  private static readonly MESSAGE_KEY = 'msg:';
  private static readonly MESSAGES_LIST_KEY = 'msgs:';
  private static readonly USER_CONVERSATIONS_KEY = 'user:convs:';
  private static readonly LLM_RESPONSE_KEY = 'llm:resp:';
  
  /**
   * Get a conversation from cache
   * @param conversationId Conversation ID
   * @returns Cached conversation or null if not in cache
   */
  async getConversation(conversationId: string): Promise<any | null> {
    if (!conversationId) return null;
    
    const cacheKey = `${ChatCacheService.CONVERSATION_KEY}${conversationId}`;
    
    try {
      const cachedConversation = await cacheManager.get<any>(cacheKey);
      if (cachedConversation) {
        log('Cache hit for conversation %s', conversationId);
        return cachedConversation;
      }
      
      log('Cache miss for conversation %s', conversationId);
      return null;
    } catch (err: unknown) {
      error('Error retrieving conversation %s from cache: %s', 
        conversationId, err instanceof Error ? err.message : String(err));
      return null;
    }
  }
  
  /**
   * Cache a conversation
   * @param conversation Conversation object to cache
   * @returns Boolean indicating success
   */
  async cacheConversation(conversation: any): Promise<boolean> {
    if (!conversation?.id) {
      error('Cannot cache conversation: missing id');
      return false;
    }
    
    const cacheKey = `${ChatCacheService.CONVERSATION_KEY}${conversation.id}`;
    
    try {
      // Cache with different TTL based on activity
      const isActiveConversation = conversation.updatedAt || conversation.last_message_at;
      const activityTime = isActiveConversation ? 
        new Date(conversation.updatedAt || conversation.last_message_at).getTime() : 0;
      const isRecent = activityTime && (Date.now() - activityTime < 24 * 60 * 60 * 1000);
      
      const ttl = isRecent ? CacheTTL.SHORT : CacheTTL.MEDIUM;
      
      const result = await cacheManager.set(cacheKey, conversation, ttl);
      log('Cached conversation %s with TTL %d', conversation.id, ttl);
      return result;
    } catch (err: unknown) {
      error('Error caching conversation %s: %s', 
        conversation.id, err instanceof Error ? err.message : String(err));
      return false;
    }
  }
  
  /**
   * Get messages for a conversation from cache
   * @param conversationId Conversation ID
   * @param options Query options (limit, cursor, etc.)
   * @returns Cached messages or null if not in cache
   */
  async getMessages(conversationId: string, options: any = {}): Promise<any[] | null> {
    if (!conversationId) return null;
    
    const cacheKey = `${ChatCacheService.MESSAGES_LIST_KEY}${conversationId}:${JSON.stringify(options)}`;
    
    try {
      const cachedMessages = await cacheManager.get<any[]>(cacheKey);
      if (cachedMessages?.length) {
        log('Cache hit for %d messages in conversation %s', cachedMessages.length, conversationId);
        return cachedMessages;
      }
      
      log('Cache miss for messages in conversation %s', conversationId);
      return null;
    } catch (err: unknown) {
      error('Error retrieving messages for conversation %s from cache: %s', 
        conversationId, err instanceof Error ? err.message : String(err));
      return null;
    }
  }
  
  /**
   * Cache messages for a conversation
   * @param conversationId Conversation ID
   * @param messages Messages to cache
   * @param options Query options (limit, cursor, etc.)
   * @returns Boolean indicating success
   */
  async cacheMessages(conversationId: string, messages: any[], options: any = {}): Promise<boolean> {
    if (!conversationId || !Array.isArray(messages)) {
      error('Cannot cache messages: invalid parameters');
      return false;
    }
    
    const cacheKey = `${ChatCacheService.MESSAGES_LIST_KEY}${conversationId}:${JSON.stringify(options)}`;
    
    try {
      // Active conversations get shorter TTL to ensure freshness
      const lastMessage = messages[messages.length - 1];
      const isActive = lastMessage?.createdAt || lastMessage?.created_at;
      const activityTime = isActive ? 
        new Date(lastMessage.createdAt || lastMessage.created_at).getTime() : 0;
      const isRecent = activityTime && (Date.now() - activityTime < 24 * 60 * 60 * 1000);
      
      const ttl = isRecent ? CacheTTL.SHORT : CacheTTL.MEDIUM;
      
      const result = await cacheManager.set(cacheKey, messages, ttl);
      log('Cached %d messages for conversation %s with TTL %d', messages.length, conversationId, ttl);
      return result;
    } catch (err: unknown) {
      error('Error caching messages for conversation %s: %s', 
        conversationId, err instanceof Error ? err.message : String(err));
      return false;
    }
  }
  
  /**
   * Get a single message from cache
   * @param messageId Message ID
   * @returns Cached message or null if not in cache
   */
  async getMessage(messageId: string): Promise<any | null> {
    if (!messageId) return null;
    
    const cacheKey = `${ChatCacheService.MESSAGE_KEY}${messageId}`;
    
    try {
      const cachedMessage = await cacheManager.get<any>(cacheKey);
      if (cachedMessage) {
        log('Cache hit for message %s', messageId);
        return cachedMessage;
      }
      
      log('Cache miss for message %s', messageId);
      return null;
    } catch (err: unknown) {
      error('Error retrieving message %s from cache: %s', 
        messageId, err instanceof Error ? err.message : String(err));
      return null;
    }
  }
  
  /**
   * Cache a single message
   * @param message Message to cache
   * @returns Boolean indicating success
   */
  async cacheMessage(message: any): Promise<boolean> {
    if (!message?.id) {
      error('Cannot cache message: missing id');
      return false;
    }
    
    const cacheKey = `${ChatCacheService.MESSAGE_KEY}${message.id}`;
    
    try {
      const result = await cacheManager.set(cacheKey, message, CacheTTL.MEDIUM);
      log('Cached message %s', message.id);
      return result;
    } catch (err: unknown) {
      error('Error caching message %s: %s', 
        message.id, err instanceof Error ? err.message : String(err));
      return false;
    }
  }
  
  /**
   * Cache an LLM response for a specific input
   * For deterministic LLM calls, we can reuse responses
   * @param input Input text or prompt
   * @param response Response from LLM
   * @param options Options used for LLM (affects cache key)
   * @returns Boolean indicating success
   */
  async cacheLLMResponse(input: string, response: string, options: any = {}): Promise<boolean> {
    if (!input) return false;
    
    // Only cache deterministic responses (temperature=0)
    if (options.temperature !== 0 && options.temperature !== '0') {
      log('Skipping caching non-deterministic LLM response (temperature=%s)', options.temperature);
      return false;
    }
    
    // Create a hash of the input and relevant options for the cache key
    const relevantOptions = { 
      model: options.model, 
      maxTokens: options.maxTokens,
      temperature: options.temperature
    };
    
    const inputHash = crypto
      .createHash('md5')
      .update(JSON.stringify({ input, options: relevantOptions }))
      .digest('hex');
    
    const cacheKey = `${ChatCacheService.LLM_RESPONSE_KEY}${inputHash}`;
    
    try {
      const result = await cacheManager.set(cacheKey, response, CacheTTL.VERY_LONG);
      log('Cached LLM response for input hash %s', inputHash);
      return result;
    } catch (err: unknown) {
      error('Error caching LLM response for input hash %s: %s', 
        inputHash, err instanceof Error ? err.message : String(err));
      return false;
    }
  }
  
  /**
   * Get cached LLM response for a specific input
   * @param input Input text or prompt
   * @param options Options used for LLM (affects cache key)
   * @returns Cached LLM response or null if not in cache
   */
  async getLLMResponse(input: string, options: any = {}): Promise<string | null> {
    if (!input) return null;
    
    // Only use cache for deterministic responses (temperature=0)
    if (options.temperature !== 0 && options.temperature !== '0') {
      log('Skipping cache lookup for non-deterministic LLM response (temperature=%s)', options.temperature);
      return null;
    }
    
    // Create a hash of the input and relevant options for the cache key
    const relevantOptions = { 
      model: options.model, 
      maxTokens: options.maxTokens,
      temperature: options.temperature
    };
    
    const inputHash = crypto
      .createHash('md5')
      .update(JSON.stringify({ input, options: relevantOptions }))
      .digest('hex');
    
    const cacheKey = `${ChatCacheService.LLM_RESPONSE_KEY}${inputHash}`;
    
    try {
      const cachedResponse = await cacheManager.get<string>(cacheKey);
      if (cachedResponse) {
        log('Cache hit for LLM response for input hash %s', inputHash);
        return cachedResponse;
      }
      
      log('Cache miss for LLM response for input hash %s', inputHash);
      return null;
    } catch (err: unknown) {
      error('Error retrieving LLM response for input hash %s from cache: %s', 
        inputHash, err instanceof Error ? err.message : String(err));
      return null;
    }
  }
  
  /**
   * Get user conversations from cache
   * @param userId User ID
   * @param options Query options
   * @returns Cached user conversations or null if not in cache
   */
  async getUserConversations(userId: string, options: any = {}): Promise<any[] | null> {
    if (!userId) return null;
    
    const cacheKey = `${ChatCacheService.USER_CONVERSATIONS_KEY}${userId}:${JSON.stringify(options)}`;
    
    try {
      const cachedConversations = await cacheManager.get<any[]>(cacheKey);
      if (cachedConversations?.length) {
        log('Cache hit for %d user conversations for user %s', cachedConversations.length, userId);
        return cachedConversations;
      }
      
      log('Cache miss for user conversations for user %s', userId);
      return null;
    } catch (err: unknown) {
      error('Error retrieving user conversations for user %s from cache: %s', 
        userId, err instanceof Error ? err.message : String(err));
      return null;
    }
  }
  
  /**
   * Cache user conversations
   * @param userId User ID
   * @param conversations Conversations to cache
   * @param options Query options
   * @returns Boolean indicating success
   */
  async cacheUserConversations(userId: string, conversations: any[], options: any = {}): Promise<boolean> {
    if (!userId || !Array.isArray(conversations)) {
      error('Cannot cache user conversations: invalid parameters');
      return false;
    }
    
    const cacheKey = `${ChatCacheService.USER_CONVERSATIONS_KEY}${userId}:${JSON.stringify(options)}`;
    
    try {
      const result = await cacheManager.set(cacheKey, conversations, CacheTTL.MEDIUM);
      log('Cached %d user conversations for user %s', conversations.length, userId);
      return result;
    } catch (err: unknown) {
      error('Error caching user conversations for user %s: %s', 
        userId, err instanceof Error ? err.message : String(err));
      return false;
    }
  }
  
  /**
   * Invalidate conversation cache when a conversation is updated
   * @param conversationId Conversation ID
   * @returns Boolean indicating success
   */
  async invalidateConversation(conversationId: string): Promise<boolean> {
    if (!conversationId) return false;
    
    try {
      // Delete the conversation cache
      await cacheManager.del(`${ChatCacheService.CONVERSATION_KEY}${conversationId}`);
      
      // Delete all messages cache for this conversation
      await cacheManager.delPattern(`${ChatCacheService.MESSAGES_LIST_KEY}${conversationId}:*`);
      
      log('Invalidated cache for conversation %s', conversationId);
      return true;
    } catch (err: unknown) {
      error('Error invalidating conversation %s cache: %s', 
        conversationId, err instanceof Error ? err.message : String(err));
      return false;
    }
  }
  
  /**
   * Invalidate message cache when a message is updated or deleted
   * @param messageId Message ID
   * @param conversationId Conversation ID
   * @returns Boolean indicating success
   */
  async invalidateMessage(messageId: string, conversationId?: string): Promise<boolean> {
    if (!messageId) return false;
    
    try {
      // Delete the message cache
      await cacheManager.del(`${ChatCacheService.MESSAGE_KEY}${messageId}`);
      
      // If conversationId is provided, invalidate the messages list too
      if (conversationId) {
        await cacheManager.delPattern(`${ChatCacheService.MESSAGES_LIST_KEY}${conversationId}:*`);
      }
      
      log('Invalidated cache for message %s', messageId);
      return true;
    } catch (err: unknown) {
      error('Error invalidating message %s cache: %s', 
        messageId, err instanceof Error ? err.message : String(err));
      return false;
    }
  }
  
  /**
   * Invalidate user conversations cache when any conversation is updated
   * @param userId User ID
   * @returns Boolean indicating success
   */
  async invalidateUserConversations(userId: string): Promise<boolean> {
    if (!userId) return false;
    
    try {
      await cacheManager.delPattern(`${ChatCacheService.USER_CONVERSATIONS_KEY}${userId}:*`);
      log('Invalidated user conversations cache for user %s', userId);
      return true;
    } catch (err: unknown) {
      error('Error invalidating user conversations cache for user %s: %s', 
        userId, err instanceof Error ? err.message : String(err));
      return false;
    }
  }
}

// Export singleton instance
export const chatCacheService = new ChatCacheService(); 