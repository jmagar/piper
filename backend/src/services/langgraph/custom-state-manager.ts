import { LangGraphStatePersistence } from './state-persistence.mjs';
import { RunnableConfig } from '@langchain/core/runnables';
import { PrismaClient } from '@prisma/client';
import debug from 'debug';

// Define interface locally instead of importing it
interface StateWithMeta {
  _meta?: {
    isStreaming?: boolean;
    lastUpdated?: string;
    persistedAt?: string;
    [key: string]: any;
  };
  messages?: Array<any>; 
  [key: string]: any;
}

const log = debug('mcp:langgraph:state-manager');
const error = debug('mcp:langgraph:state-manager:error');

/**
 * Custom state manager for LangGraph that integrates with our state persistence system
 * This bridges between the LangGraph checkpoint system and our custom state persistence
 */
export class CustomStateManager {
  private statePersistence: LangGraphStatePersistence;
  
  constructor(prisma: PrismaClient) {
    this.statePersistence = new LangGraphStatePersistence(prisma);
    log('Initialized CustomStateManager with LangGraphStatePersistence');
  }
  
  /**
   * Get state for a thread ID from config
   * @returns The state object with metadata or undefined
   */
  async get(config: RunnableConfig): Promise<StateWithMeta | undefined> {
    try {
      const threadId = this.extractThreadId(config);
      if (!threadId) {
        log('No thread ID in config, returning null');
        return undefined;
      }
      
      log('Getting state for thread ID: %s', threadId);
      const state = await this.statePersistence.getState(threadId);
      if (!state) {
        log('No state found for thread %s', threadId);
        return undefined;
      }
      
      log('Found state for thread %s', threadId);
      return state;
    } catch (err) {
      error('Error getting state: %s', err instanceof Error ? err.message : String(err));
      return undefined;
    }
  }
  
  /**
   * Save state for a thread ID from config
   */
  async set(config: RunnableConfig, state: any) {
    try {
      const threadId = this.extractThreadId(config);
      if (!threadId) {
        log('No thread ID in config, skipping state save');
        return;
      }
      
      const conversationId = (config.configurable?.conversation_id as string) || threadId.split(':')[0] || 'default';
      log('Saving state for thread %s in conversation %s', threadId, conversationId);
      
      await this.statePersistence.saveState(
        threadId,
        state,
        {
          conversationId,
          isComplete: true,
          notifyClients: true
        }
      );
      
      log('Successfully saved state for thread %s', threadId);
    } catch (err) {
      error('Error saving state: %s', err instanceof Error ? err.message : String(err));
    }
  }
  
  /**
   * Delete state for a thread ID
   */
  async delete(threadId: string) {
    try {
      if (!threadId) {
        log('No thread ID provided, skipping state deletion');
        return;
      }
      
      log('Deleting state for thread %s', threadId);
      await this.statePersistence.deleteState(threadId);
      log('Successfully deleted state for thread %s', threadId);
    } catch (err) {
      error('Error deleting state: %s', err instanceof Error ? err.message : String(err));
    }
  }
  
  /**
   * Save streaming state for a thread
   */
  async saveStreamingState(threadId: string, partialResponse: string, options: any = {}) {
    try {
      if (!threadId) {
        log('No thread ID provided, skipping streaming state save');
        return;
      }
      
      log('Saving streaming state for thread %s', threadId);
      await this.statePersistence.saveStreamingState(threadId, {
        partialResponse,
        messageId: options.messageId,
        chunkCount: options.chunkCount || Math.floor(partialResponse.length / 10),
        role: 'assistant',
        conversationId: options.conversationId
      });
      
      log('Successfully saved streaming state for thread %s', threadId);
    } catch (err) {
      error('Error saving streaming state: %s', err instanceof Error ? err.message : String(err));
    }
  }
  
  /**
   * Complete streaming state for a thread
   */
  async completeStreamingState(threadId: string, content: string, options: any = {}) {
    try {
      if (!threadId) {
        log('No thread ID provided, skipping streaming completion');
        return;
      }
      
      log('Completing streaming state for thread %s', threadId);
      await this.statePersistence.completeStreamingState(threadId, {
        partialResponse: content,
        messageId: options.messageId,
        role: 'assistant',
        conversationId: options.conversationId,
        completed: true
      });
      
      log('Successfully completed streaming for thread %s', threadId);
    } catch (err) {
      error('Error completing streaming state: %s', err instanceof Error ? err.message : String(err));
    }
  }
  
  /**
   * Helper to extract thread ID from config
   */
  private extractThreadId(config: RunnableConfig): string | null {
    if (!config.configurable) return null;
    return (config.configurable.thread_id as string) || null;
  }
}
