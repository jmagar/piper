import { PrismaClient, Prisma } from '@prisma/client';
import debug from 'debug';
import { cacheManager } from '../cache/cache-manager.mjs';

const log = debug('langgraph:state');
const error = debug('langgraph:state:error');

/**
 * Redis and PostgreSQL backed persistence for LangGraph state
 * Custom implementation that provides state persistence using both Redis (for speed) and PostgreSQL (for durability)
 */
export class LangGraphStatePersistence {
  private readonly keyPrefix = 'langgraph:state:';
  private prisma: PrismaClient;
  
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    log('Initialized Redis/PostgreSQL state persistence for LangGraph');
  }
  
  /**
   * Get state for a thread from Redis/PostgreSQL
   * @param threadId The thread ID to get state for
   * @returns The thread state or null if not found
   */
  async getState(threadId: string): Promise<object | null> {
    try {
      log('Retrieving state for thread %s', threadId);
      const cacheKey = `${this.keyPrefix}${threadId}`;
      
      // Try to get from Redis first (faster)
      const cachedState = await cacheManager.get<object>(cacheKey);
      if (cachedState) {
        log('Cache hit for thread %s', threadId);
        return cachedState;
      }
      
      log('Cache miss for thread %s, checking database', threadId);
      
      // If not in Redis, try the database
      const dbState = await this.prisma.langGraphState.findUnique({
        where: { thread_id: threadId }
      });
      
      if (!dbState) {
        log('No state found for thread %s', threadId);
        return null;
      }
      
      // Cache the state for future requests
      const stateObj = dbState.state as object;
      await cacheManager.set(cacheKey, stateObj);
      
      log('Retrieved state for thread %s from database', threadId);
      return stateObj;
    } catch (err) {
      error('Error retrieving state for thread %s: %s', threadId, err instanceof Error ? err.message : String(err));
      return null;
    }
  }
  
  /**
   * Store state for a thread in Redis and database
   * @param threadId The thread ID to store state for
   * @param state The state to store
   * @param config Additional configuration options
   */
  async saveState(
    threadId: string, 
    state: object, 
    config: { 
      conversationId?: string; 
      isComplete?: boolean; 
      ttl?: string | Date;
    } = {}
  ): Promise<void> {
    try {
      log('Storing state for thread %s', threadId);
      const cacheKey = `${this.keyPrefix}${threadId}`;
      
      // Get conversation ID from config
      const conversationId = config.conversationId || '';
      
      // Cache state in Redis for fast access
      await cacheManager.set(cacheKey, state);
      
      // Determine if we should mark as completed
      const isComplete = Boolean(config.isComplete);
      
      // Set TTL if provided
      let ttl: Date | null = null;
      if (config.ttl) {
        ttl = config.ttl instanceof Date ? config.ttl : new Date(config.ttl);
      }
      
      // Store in database for persistence
      await this.prisma.langGraphState.upsert({
        where: { thread_id: threadId },
        update: {
          state: state as Prisma.JsonObject,
          updated_at: new Date(),
          is_completed: isComplete,
          ttl
        },
        create: {
          thread_id: threadId,
          conversation_id: conversationId,
          state: state as Prisma.JsonObject,
          is_completed: isComplete,
          ttl
        }
      });
      
      log('State stored for thread %s', threadId);
    } catch (err) {
      error('Error storing state for thread %s: %s', threadId, err instanceof Error ? err.message : String(err));
      // Throw to notify caller - this is a critical operation
      throw err;
    }
  }
  
  /**
   * Delete state for a thread
   * @param threadId The thread ID to delete state for
   */
  async deleteState(threadId: string): Promise<void> {
    try {
      log('Deleting state for thread %s', threadId);
      const cacheKey = `${this.keyPrefix}${threadId}`;
      
      // Delete from Redis
      await cacheManager.del(cacheKey);
      
      // Delete from database
      await this.prisma.langGraphState.delete({
        where: { thread_id: threadId }
      }).catch(err => {
        // Ignore not found errors
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025')) {
          throw err;
        }
      });
      
      log('State deleted for thread %s', threadId);
    } catch (err) {
      error('Error deleting state for thread %s: %s', threadId, err instanceof Error ? err.message : String(err));
      // Non-fatal, just log
    }
  }
  
  /**
   * Clear all state (typically for testing/reset)
   * Warning: This permanently deletes all state
   */
  async clearAllState(): Promise<void> {
    try {
      log('Clearing all LangGraph state');
      
      // Delete all Redis keys with our prefix
      await cacheManager.delPattern(`${this.keyPrefix}*`);
      
      // Delete all records from database
      await this.prisma.langGraphState.deleteMany({});
      
      log('All LangGraph state cleared');
    } catch (err) {
      error('Error clearing LangGraph state: %s', err instanceof Error ? err.message : String(err));
      throw err;
    }
  }
  
  /**
   * List all thread IDs (for debugging/admin purposes)
   * @returns Array of thread IDs
   */
  async listThreadIds(): Promise<string[]> {
    try {
      log('Listing all thread IDs');
      
      // Get all thread IDs from database
      const states = await this.prisma.langGraphState.findMany({
        select: { thread_id: true }
      });
      
      const threadIds = states.map(state => state.thread_id);
      log('Found %d thread IDs', threadIds.length);
      return threadIds;
    } catch (err) {
      error('Error listing thread IDs: %s', err instanceof Error ? err.message : String(err));
      return [];
    }
  }
  
  /**
   * Get conversation state
   * @param conversationId The conversation ID to get state for
   * @returns Array of thread states for the conversation
   */
  async getConversationState(conversationId: string): Promise<object[]> {
    try {
      log('Getting state for conversation %s', conversationId);
      
      // Get all states for the conversation
      const states = await this.prisma.langGraphState.findMany({
        where: { conversation_id: conversationId }
      });
      
      if (states.length === 0) {
        log('No state found for conversation %s', conversationId);
        return [];
      }
      
      // Return array of state objects
      const stateObjs = states.map(state => state.state as object);
      log('Found %d states for conversation %s', stateObjs.length, conversationId);
      return stateObjs;
    } catch (err) {
      error('Error retrieving states for conversation %s: %s', conversationId, err instanceof Error ? err.message : String(err));
      return [];
    }
  }
} 