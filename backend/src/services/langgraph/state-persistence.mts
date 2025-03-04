import { PrismaClient, Prisma } from '@prisma/client';
import debug from 'debug';
import { cacheManager } from '../cache/cache-manager.mjs';

const log = debug('langgraph:state');
const error = debug('langgraph:state:error');
const diagnostic = debug('langgraph:state:diagnostic'); // Added diagnostic logger

// Define the interface for state object outside the class
interface StateWithMeta {
  _meta?: {
    isStreaming?: boolean;
    lastUpdated?: string;
    persistedAt?: string;
    [key: string]: any;
  };
  messages?: Array<any>; // Add messages array to state interface
  [key: string]: any;
}

// Interface for streaming state
interface StreamingState {
  partialResponse: string;
  messageId?: string;
  chunkCount?: number;
  completed?: boolean;
  role?: string;
  conversationId?: string;
  lastUpdated?: string;
  [key: string]: any;
}

// Configuration options for saving state
interface SaveStateConfig {
  conversationId?: string;
  isComplete?: boolean;
  ttl?: string | Date;
  isStreaming?: boolean;
  notifyClients?: boolean; // Added option to control notifications
}

// Event types for state change notifications
type StateChangeEvent = 'state_updated' | 'stream_started' | 'stream_updated' | 'stream_completed';

/**
 * Redis and PostgreSQL backed persistence for LangGraph state
 * Custom implementation that provides state persistence using both Redis (for speed) and PostgreSQL (for durability)
 */
export class LangGraphStatePersistence {
  private readonly keyPrefix = 'langgraph:state:';
  private prisma: PrismaClient;
  private eventEmitter: any | null = null; // Will be set if socket.io or other event emitter is provided
  
  constructor(prisma: PrismaClient, eventEmitter: any = null) {
    this.prisma = prisma;
    this.eventEmitter = eventEmitter;
    log('Initialized Redis/PostgreSQL state persistence for LangGraph');
  }
  
  /**
   * Get state for a thread from Redis/PostgreSQL
   * @param threadId The thread ID to get state for
   * @returns The thread state or null if not found
   */
  async getState(threadId: string): Promise<StateWithMeta | null> {
    try {
      log('Retrieving state for thread %s', threadId);
      const cacheKey = `${this.keyPrefix}${threadId}`;
      
      // Try to get from Redis first (faster)
      const cachedState = await cacheManager.get<StateWithMeta>(cacheKey);
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
      const stateObj = dbState.state as StateWithMeta;
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
    state: StateWithMeta, 
    config: SaveStateConfig = {}
  ): Promise<void> {
    try {
      log('Storing state for thread %s (streaming: %s, complete: %s)', 
          threadId, 
          Boolean(config.isStreaming),
          Boolean(config.isComplete));
      
      const cacheKey = `${this.keyPrefix}${threadId}`;
      
      // Get conversation ID from config
      const conversationId = config.conversationId || '';
      
      // Determine if we should mark as completed
      const isComplete = Boolean(config.isComplete);
      
      // Set TTL if provided
      let ttl: Date | null = null;
      if (config.ttl) {
        ttl = config.ttl instanceof Date ? config.ttl : new Date(config.ttl);
      }
      
      // Add streaming metadata if needed
      const stateToSave = {
        ...state,
        _meta: {
          ...((state._meta) || {}),
          isStreaming: config.isStreaming || false,
          lastUpdated: new Date().toISOString(),
          persistedAt: new Date().toISOString()
        }
      };
      
      // Use a transaction to ensure data consistency between Redis and PostgreSQL
      await this.prisma.$transaction(async (tx) => {
        // Cache state in Redis for fast access (with shorter TTL for streaming state)
        if (config.isStreaming) {
          // Use shorter TTL for streaming states to avoid Redis bloat
          const streamingTtlMs = 15 * 60 * 1000; // 15 minutes
          await cacheManager.set(cacheKey, stateToSave, streamingTtlMs);
        } else {
          // Standard caching for complete states
          await cacheManager.set(cacheKey, stateToSave);
        }
        
        // Store in database for persistence
        await tx.langGraphState.upsert({
          where: { thread_id: threadId },
          update: {
            state: stateToSave as Prisma.JsonObject,
            updated_at: new Date(),
            is_completed: isComplete,
            ttl
          },
          create: {
            thread_id: threadId,
            conversation_id: conversationId,
            state: stateToSave as Prisma.JsonObject,
            is_completed: isComplete,
            ttl
          }
        });
      });
      
      log('State stored for thread %s', threadId);
      
      // Notify clients about state changes if needed
      if (config.notifyClients !== false && this.eventEmitter) {
        this.notifyStateChange(threadId, 'state_updated', {
          threadId,
          conversationId,
          isComplete
        });
      }
      
      // Add diagnostic logging for message visibility debugging
      if (state.messages && state.messages.length > 0) {
        diagnostic('State saved with %d messages for thread %s', 
                  state.messages.length, 
                  threadId);
        diagnostic('Last message: %o', 
                  state.messages[state.messages.length - 1]);
      }
    } catch (err) {
      error('Error storing state for thread %s: %s', threadId, err instanceof Error ? err.message : String(err));
      // Throw to notify caller - this is a critical operation
      throw err;
    }
  }
  
  /**
   * Save streaming state for a thread
   * @param threadId The thread ID to save streaming state for
   * @param streamingState The streaming state to save
   * @returns Promise that resolves when state is saved
   */
  async saveStreamingState(threadId: string, streamingState: Partial<StreamingState>): Promise<void> {
    try {
      const cacheKey = `${this.keyPrefix}${threadId}:streaming`;
      
      // Get existing state to merge with
      const existingState = await cacheManager.get<StreamingState>(cacheKey) || { partialResponse: '' };
      
      // Merge existing state with new state
      const mergedState: StreamingState = {
        ...existingState,
        ...streamingState,
        // Ensure partialResponse is always a string as required by the interface
        partialResponse: streamingState.partialResponse || existingState.partialResponse || '',
        lastUpdated: new Date().toISOString()
      };
      
      // Save to Redis with longer TTL for streaming
      await cacheManager.set(
        cacheKey, 
        mergedState, 
        30 * 60 * 1000 // 30 minute TTL for streaming state
      );
      
      // Notify clients about streaming updates
      if (this.eventEmitter) {
        this.notifyStateChange(threadId, 'stream_updated', {
          threadId,
          chunkCount: mergedState.chunkCount,
          messageId: mergedState.messageId
        });
      }
      
      // For completed streams, properly merge with main state
      if (streamingState.completed) {
        await this.completeStreamingState(threadId, mergedState);
      }
    } catch (err) {
      // Non-fatal for streaming checkpoints, just log the error
      error('Error in streaming state for thread %s: %s', 
            threadId, err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Complete streaming state and merge with main state
   * @param threadId The thread ID to complete streaming for
   * @param streamingState The final streaming state
   */
  async completeStreamingState(threadId: string, streamingState: StreamingState): Promise<void> {
    try {
      diagnostic('Completing streaming state for thread %s', threadId);
      log('Completing streaming state for thread %s with message %s', threadId, streamingState.messageId);
      
      // Get the main state
      const mainState = await this.getState(threadId) || { messages: [] };
      
      // Extract important data from streaming state
      const { 
        messageId = `msg-${Date.now()}`,
        partialResponse,
        role = 'assistant',
        conversationId
      } = streamingState;
      
      if (!partialResponse) {
        log('Warning: No partial response in streaming state for message %s', messageId);
      }
      
      // Check if this message already exists in the state
      const messageExists = mainState.messages?.some(msg => msg.id === messageId);
      
      if (messageExists) {
        diagnostic('Message %s already exists in main state, updating', messageId);
        
        // Update the existing message
        const updatedMessages = mainState.messages?.map(msg => 
          msg.id === messageId 
            ? {
                ...msg,
                content: partialResponse || msg.content, // Ensure we keep existing content if partialResponse is empty
                status: 'delivered',
                updatedAt: new Date().toISOString()
              }
            : msg
        );
        
        mainState.messages = updatedMessages;
        
        log('Updated existing message %s in thread state', messageId);
      } else {
        log('Adding new completed message %s to main state', messageId);
        
        // Only add if we have content
        if (partialResponse) {
          // Create new message object
          const newMessage = {
            id: messageId,
            content: partialResponse,
            role: role,
            type: 'text',
            status: 'delivered',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {
              streaming: false,
              streamCompleted: true,
              streamCompletedAt: new Date().toISOString(),
              chunks: streamingState.chunkCount || 0
            }
          };
          
          // Add to messages array
          mainState.messages = [...(mainState.messages || []), newMessage];
          
          log('Added new message %s to thread state with content length %d', 
              messageId, partialResponse.length);
        } else {
          log('Warning: Skipping adding message %s due to empty content', messageId);
        }
      }
      
      // Update main state with the merged content
      await this.saveState(threadId, mainState, {
        isComplete: true,
        conversationId: conversationId || mainState._meta?.conversationId,
        notifyClients: true
      });
      
      log('Successfully completed streaming state for thread %s', threadId);
      
      // Notify about stream completion
      if (this.eventEmitter) {
        this.notifyStateChange(threadId, 'stream_completed', {
          threadId,
          messageId,
          conversationId
        });
      }
    } catch (err) {
      error('Error completing streaming state for thread %s: %s', 
            threadId, err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Get the current streaming state for a thread
   * @param threadId The thread ID to get streaming state for
   * @returns The streaming state or null if not found
   */
  async getStreamingState(threadId: string): Promise<StreamingState | null> {
    try {
      const cacheKey = `${this.keyPrefix}${threadId}:streaming`;
      return await cacheManager.get<StreamingState>(cacheKey);
    } catch (err) {
      error('Error retrieving streaming state for thread %s: %s', 
            threadId, err instanceof Error ? err.message : String(err));
      return null;
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
      const streamingCacheKey = `${this.keyPrefix}${threadId}:streaming`;
      
      // Use transaction for consistency
      await this.prisma.$transaction(async (tx) => {
        // Delete from Redis
        await Promise.all([
          cacheManager.del(cacheKey),
          cacheManager.del(streamingCacheKey)
        ]);
        
        // Delete from database
        await tx.langGraphState.deleteMany({
          where: { thread_id: threadId }
        });
      }).catch(err => {
        // Ignore not found errors
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025')) {
          throw err;
        }
      });
      
      log('State deleted for thread %s', threadId);
      
      // Notify about state deletion
      if (this.eventEmitter) {
        this.notifyStateChange(threadId, 'state_updated', {
          threadId,
          deleted: true
        });
      }
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
  
  /**
   * Notify clients about state changes
   * @param threadId The thread ID that changed
   * @param eventType The type of state change
   * @param data Additional data to include in the notification
   */
  private notifyStateChange(threadId: string, eventType: StateChangeEvent, data: any = {}): void {
    if (!this.eventEmitter) return;
    
    try {
      // Basic event emission with an event emitter library
      this.eventEmitter.emit(`${threadId}:${eventType}`, data);
      
      // If using Socket.IO, you could also broadcast to rooms
      if (typeof this.eventEmitter.to === 'function') {
        this.eventEmitter
          .to(`thread:${threadId}`)
          .emit(eventType, { ...data, threadId });
        
        // If conversation ID is available, also notify conversation room
        if (data.conversationId) {
          this.eventEmitter
            .to(`conversation:${data.conversationId}`)
            .emit(eventType, { ...data, threadId });
        }
      }
      
      log('Notified clients about %s for thread %s', eventType, threadId);
    } catch (err) {
      error('Error notifying about state change for thread %s: %s', 
            threadId, err instanceof Error ? err.message : String(err));
    }
  }
} 