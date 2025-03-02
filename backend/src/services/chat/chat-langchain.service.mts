import { PrismaClient, Prisma } from '@prisma/client';
import debug from 'debug';
import crypto from 'crypto';
import { HumanMessage } from '@langchain/core/messages';

import { createLangGraph } from '../../langgraph/index.js';
import type { 
  ChatMessage, 
  ChatMetadata, 
  MessageType,
  MessageStatus,
  StreamingOptions,
  StreamingMetadataFields
} from '../../types/chat.mjs';
import { createMetadata, createStreamingMetadata } from '../../types/chat.mjs';
import { chatCacheService } from './chat-cache.service.mjs';

const log = debug('mcp:chat:langchain');
const error = debug('mcp:chat:langchain:error');

/**
 * Interface representing streaming message state
 */
interface StreamingState {
  chunks: string[];
  content: string;
  messageId?: string;
  status: 'initializing' | 'streaming' | 'complete' | 'error';
  isComplete?: boolean;
  startTime: number;
  endTime?: number;
  streamStartTime: string;
  streamEndTime?: string;
  streamDuration?: number;
  error?: string;
}

/**
 * Unified chat service that combines functionality from both previous services.
 * Handles both streaming and non-streaming chat interactions, caching, and tool responses.
 */
export class ChatLangChainService {
  private agent: Awaited<ReturnType<typeof createLangGraph>> | null = null;
  private prisma: PrismaClient;
  private streamingMessages: Map<string, StreamingState> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    log('Initialized ChatLangChainService');
  }

  private generateStreamId(): string {
    return crypto.randomUUID();
  }

  private async initAgent() {
    if (!this.agent) {
      try {
        log('Initializing LangGraph agent...');
        this.agent = await createLangGraph(this.prisma);
        log('LangGraph agent initialized successfully');
      } catch (err) {
        error('Failed to initialize LangGraph agent: %s', err instanceof Error ? err.message : String(err));
        // Don't throw an error, just return null to allow graceful degradation
        return null;
      }
    }
    return this.agent;
  }

  /**
   * Gets a fallback response when agent is unavailable
   * @param message User's message
   * @returns Fallback response text
   */
  private getFallbackResponse(message: string): string {
    // Simple keyword-based handling for common queries when agent is unavailable
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi ')) {
      return "Hello! I'm currently operating with limited capabilities due to some technical issues. I can still chat with you, but some of my advanced features might not be available.";
    } else if (lowerMessage.includes('help')) {
      return "I'm here to help, though I'm currently operating with limited capabilities. What can I assist you with? For complex tasks, you might need to wait until my full capabilities are restored.";
    } else if (lowerMessage.includes('weather') || lowerMessage.includes('forecast')) {
      return "I'd like to help with weather information, but I'm currently unable to access my weather tools. Please try again later or check a weather website directly.";
    } else {
      return "I'm currently experiencing some technical difficulties with my tools and advanced capabilities. I can still chat with you, but for complex tasks, you might need to try again later.";
    }
  }

  /**
   * Format a tool response for better readability
   * @param response Raw response string from the tool
   * @returns Formatted response
   */
  private formatToolResponse(response: string): string {
    try {
      // Try to parse as JSON first
      const data = JSON.parse(response);
      
      // Handle file listing response
      if (Array.isArray(data) && data.every(item => typeof item === 'object' && 'name' in item)) {
        const fileList = data
          .map(file => `${file.type === 'directory' ? '📁' : '📄'} ${file.name}`)
          .join('\n');
        return `Directory contents:\n\n${fileList}`;
      }
      
      // For other JSON responses, pretty print
      return JSON.stringify(data, null, 2);
    } catch {
      // If not JSON, return as is
      return response;
    }
  }
  
  /**
   * Check if a query is deterministic and might be cacheable
   */
  private isDeterministicQuery(message: string): boolean {
    return message.startsWith('list') || 
           message.startsWith('show') || 
           message.includes('what is') ||
           message.includes('how to');
  }

  /**
   * Process a message with streaming responses
   * @param message User message
   * @param userId User ID
   * @param options Streaming options with callbacks
   * @param conversationId Optional conversation ID
   * @returns Processed chat message
   */
  async processStreamingMessage(
    message: string,
    userId: string,
    options: StreamingOptions = {
      onChunk: () => {},
      onError: () => {},
      onComplete: () => {}
    },
    conversationId?: string
  ): Promise<ChatMessage> {
    const streamId = this.generateStreamId();
    const streamStartTime = new Date().toISOString();
    
    // Initialize stream state with empty string for content
    this.streamingMessages.set(streamId, {
      chunks: [],
      messageId: undefined,
      status: 'initializing',
      startTime: Date.now(),
      endTime: undefined,
      content: '', // Initialize as empty string
      streamStartTime // Initialize with current time
    });
    log('Starting streaming message processing, streamId: %s', streamId);

    try {
      // Create or find user and conversation first
      const { userMessage, conversation, user } = await this.createInitialMessage(
        message,
        userId,
        conversationId,
        'streaming'
      );

      // Now we have the user message and conversation properly initialized
      log('Created initial message with ID %s in conversation %s', userMessage.id, conversation.id);

      // Create initial assistant message
      const initialMetadata: Partial<StreamingMetadataFields> = {
        type: 'stream-chunk',
        streamStartTime,
        streamEndTime: undefined,
        streamDuration: 0
      };

      const assistantMessage = await this.prisma.chatMessage.create({
        data: {
          content: '',
          role: 'assistant',
          conversation_id: conversation.id,
          user_id: userId,
          parent_id: userMessage.id,
          metadata: createStreamingMetadata(streamId, 'streaming', initialMetadata),
          status: 'streaming' as MessageStatus
        }
      });

      // Store message ID for error handling
      const streamingState = this.streamingMessages.get(streamId);
      if (streamingState) {
        streamingState.messageId = assistantMessage.id;
      }

      // Start streaming process
      const agent = await this.initAgent();
      if (!agent) {
        // Handle case when agent initialization fails
        log('Agent unavailable, using fallback response');
        
        // Get fallback response
        const fallbackResponse = this.getFallbackResponse(message);
        
        // Emit fallback response as a chunk
        await options.onChunk?.(fallbackResponse);
        
        // Store chunk in streaming state
        const streamState = this.streamingMessages.get(streamId);
        if (streamState) {
          streamState.chunks.push(fallbackResponse);
          streamState.content = fallbackResponse; // Ensure content is set
          streamState.status = 'complete';
          streamState.endTime = Date.now();
        }
        
        // Update the message in the database
        await this.prisma.chatMessage.update({
          where: { id: assistantMessage.id },
          data: {
            content: fallbackResponse,
            status: 'sent' as MessageStatus,
            metadata: createStreamingMetadata(streamId, 'complete', {
              type: 'text',
              streamStartTime: new Date(streamStartTime).toISOString(),
              streamEndTime: new Date(Date.now()).toISOString(),
              streamDuration: Date.now() - Date.parse(streamStartTime),
              error: 'agent_unavailable'
            })
          }
        });
        
        // Signal completion
        await options.onComplete?.();
        
        // Convert to ChatMessage format
        return {
          id: assistantMessage.id,
          content: fallbackResponse,
          role: assistantMessage.role as 'assistant',
          userId: assistantMessage.user_id || '',
          username: user?.name || 'Assistant',
          conversationId: conversation.id,
          parentId: assistantMessage.parent_id || undefined,
          type: 'text',
          metadata: {
            streamStatus: 'complete',
            error: 'agent_unavailable'
          } as ChatMetadata,
          createdAt: assistantMessage.created_at,
          updatedAt: assistantMessage.updated_at
        };
      }

      // Process streaming response with the agent
      log('Invoking agent with streaming for streamId %s', streamId);
      
      // Process streaming response
      log('Invoking agent with streaming for streamId %s', streamId);
      const enhancedOptions = {
        ...options,
        onChunk: async (chunk: string) => {
          log('Received chunk for streamId %s, length: %d, content: %s', streamId, chunk.length, chunk.substring(0, 50));
          const state = this.streamingMessages.get(streamId);
          if (state && !state.isComplete && !state.error) {
            state.content += chunk;
            state.chunks.push(chunk);
            
            // Update message content in real-time
            try {
              await this.prisma.chatMessage.update({
                where: { id: assistantMessage.id },
                data: {
                  content: state.content,
                  metadata: createStreamingMetadata(streamId, 'streaming', {
                    ...initialMetadata,
                    chunkCount: state.chunks.length,
                    totalLength: state.content.length
                  })
                }
              });
            } catch (err) {
              error('Failed to update message content: %s', err instanceof Error ? err.message : String(err));
            }
          }
          options.onChunk(chunk);
        },
        onError: async (err: Error) => {
          error('Streaming error for streamId %s: %s', streamId, err.message);
          error('Error stack: %s', err.stack);
          const state = this.streamingMessages.get(streamId);
          if (state && !state.isComplete) {
            state.error = err.message;
            try {
              await this.prisma.chatMessage.update({
                where: { id: assistantMessage.id },
                data: {
                  metadata: createStreamingMetadata(streamId, 'error', {
                    type: 'stream-chunk',
                    error: err.message,
                    errorStack: err.stack,
                    streamStartTime: state.streamStartTime,
                    streamEndTime: new Date().toISOString()
                  }),
                  status: 'error' as MessageStatus
                }
              });
            } catch (updateErr) {
              error('Failed to update message error state: %s', updateErr instanceof Error ? updateErr.message : String(updateErr));
            }
          }
          options.onError(err);
        },
        onComplete: async () => {
          log('Streaming complete for streamId %s', streamId);
          const state = this.streamingMessages.get(streamId);
          if (state && !state.error) {
            state.isComplete = true;
            state.streamEndTime = new Date().toISOString();
            state.streamDuration = Date.now() - new Date(state.streamStartTime).getTime();
            log('Final content length: %d', state.content.length);
            
            // Handle empty content situation
            if (state.content.length === 0) {
              state.content = "I'm having trouble generating a response right now. Could you please try rephrasing your question or try again later?";
              log('Using fallback response due to empty content');
            }
            
            try {
              await this.prisma.chatMessage.update({
                where: { id: assistantMessage.id },
                data: {
                  content: state.content,
                  metadata: createStreamingMetadata(streamId, 'complete', {
                    type: 'text',
                    chunkCount: state.chunks.length,
                    totalLength: state.content.length,
                    streamStartTime: state.streamStartTime,
                    streamEndTime: state.streamEndTime,
                    streamDuration: state.streamDuration
                  }),
                  status: 'sent' as MessageStatus
                }
              });
            } catch (updateErr) {
              error('Failed to update final message state: %s', updateErr instanceof Error ? updateErr.message : String(updateErr));
            }
          }
          
          // Cache deterministic responses
          if (this.isDeterministicQuery(message) && state && state.content && state.content.length > 0) {
            try {
              await chatCacheService.cacheLLMResponse(message, state.content, { temperature: 0 });
              log('Cached deterministic streaming response for future use');
            } catch (cacheErr) {
              error('Error caching streamed response: %s', cacheErr instanceof Error ? cacheErr.message : String(cacheErr));
            }
          }
          
          options.onComplete();
        }
      };

      log('Calling agent.invoke with message: %s', message);
      
      try {
        // Pass the message in the format LangGraph expects - as a messages array
        await agent.invoke(
          { messages: [new HumanMessage(message)] },
          { 
            streaming: true,
            streamingOptions: enhancedOptions,
            configurable: {
              thread_id: conversation.id,
              direct_response: true,
              force_streaming: true,
              standalone_question: true
            }
          }
        );
      } catch (err) {
        error('Error during agent.invoke: %s', err instanceof Error ? err.message : String(err));
        throw err;
      }

      // Get final state from streaming
      const finalState = this.streamingMessages.get(streamId);
      if (!finalState) {
        throw new Error('Streaming state was unexpectedly cleared');
      }

      // If we have an empty response, provide a fallback
      if (finalState.content.length === 0) {
        finalState.content = "I apologize, but I'm having trouble generating a response. Please try asking your question in a different way.";
        log('Using fallback response after streaming due to empty content');
        
        // Update the message in the database
        await this.prisma.chatMessage.update({
          where: { id: assistantMessage.id },
          data: {
            content: finalState.content,
            status: 'sent' as MessageStatus
          }
        });
      }

      // Cache messages and conversation
      try {
        await chatCacheService.cacheMessage(userMessage);
        await chatCacheService.cacheMessage({
          ...assistantMessage,
          content: finalState.content,
          status: 'sent'
        });
        await chatCacheService.cacheConversation(conversation);
      } catch (cacheErr) {
        // Non-fatal, just log
        error('Error caching streaming entities: %s', cacheErr instanceof Error ? cacheErr.message : String(cacheErr));
      }

      // Clean up streaming state
      this.streamingMessages.delete(streamId);

      // Return final message state with guaranteed content (no undefined)
      return {
        id: assistantMessage.id,
        content: finalState.content || '', // Ensure content is never undefined
        role: assistantMessage.role as 'assistant',
        userId: assistantMessage.user_id ?? '',
        username: user.name ?? '',
        conversationId: conversation.id,
        parentId: assistantMessage.parent_id ?? undefined,
        type: 'text',
        metadata: {
          streamStatus: 'complete' as const,
          streamId,
          type: 'text' as const,
          chunkCount: finalState.chunks.length,
          totalLength: finalState.content.length,
          streamStartTime: finalState.streamStartTime,
          streamEndTime: finalState.streamEndTime || undefined,
          streamDuration: finalState.streamDuration || 0,
          timestamp: new Date().toISOString(),
          fromCache: true
        } as Prisma.JsonObject as ChatMetadata,
        createdAt: assistantMessage.created_at,
        updatedAt: assistantMessage.updated_at
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      error('Error in streaming message (streamId %s): %s', streamId, errorMessage);
      error('Stack trace: %s', err instanceof Error ? err.stack : 'No stack trace available');

      // Capture error state before cleanup
      const errorState = this.streamingMessages.get(streamId);
      
      try {
        if (errorState?.messageId) {
          await this.prisma.chatMessage.update({
            where: { id: errorState.messageId },
            data: {
              metadata: createStreamingMetadata(streamId, 'error', {
                type: 'text',
                error: errorMessage,
                errorStack: err instanceof Error ? err.stack : undefined,
                errorCode: err instanceof Error ? err.name : 'UnknownError',
                streamStartTime: errorState.streamStartTime || new Date().toISOString(),
                streamEndTime: new Date().toISOString()
              }),
              status: 'error' as MessageStatus
            }
          });
        }
      } catch (updateErr) {
        error('Failed to update message status for streamId %s: %s', streamId, 
          updateErr instanceof Error ? updateErr.message : String(updateErr)
        );
      }

      // Clean up streaming state
      this.streamingMessages.delete(streamId);
      
      options.onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    }
  }

  /**
   * Process a message without streaming
   * @param message User message
   * @param userId User ID
   * @param conversationId Optional conversation ID
   * @returns Processed chat message
   */
  async processMessage(
    message: string,
    userId: string,
    conversationId?: string
  ): Promise<ChatMessage> {
    let initialUserMessage;
    try {
      log('Processing message from user %s: %s', userId, message);

      // Check if this is a deterministic query that might be in cache
      const isDeterministic = this.isDeterministicQuery(message);
      
      if (isDeterministic) {
        try {
          // Try to get from cache
          const cachedResponse = await chatCacheService.getLLMResponse(message, { temperature: 0 });
          
          if (cachedResponse) {
            log('Cache hit for deterministic query: %s', message);
            
            // Still need to create the database entities
            const { userMessage, conversation, user } = await this.createInitialMessage(
              message,
              userId,
              conversationId,
              'sending'
            );
            initialUserMessage = userMessage;
            
            // Update user message status to 'sent' after successful processing
            await this.prisma.chatMessage.update({
              where: { id: initialUserMessage.id },
              data: { status: 'sent' as MessageStatus }
            });
            
            // Create assistant message with cached response
            const metadataObj = createMetadata({
              type: 'text',
              timestamp: new Date().toISOString(),
            });
            
            // Add custom field for caching - this works because createMetadata ultimately returns a Prisma.JsonObject
            // which can accept any JSON-serializable fields
            const metadataWithCache = {
              ...metadataObj,
              fromCache: true
            };
            
            // Store assistant response with explicit 'sent' status
            const assistantMessage = await this.prisma.chatMessage.create({
              data: {
                content: cachedResponse,
                role: 'assistant',
                conversation_id: conversation.id,
                user_id: userId,
                parent_id: initialUserMessage.id,
                metadata: metadataWithCache,
                status: 'sent' as MessageStatus
              }
            });
            
            // Cache messages and conversation
            try {
              await chatCacheService.cacheMessage(userMessage);
              await chatCacheService.cacheMessage(assistantMessage);
              await chatCacheService.cacheConversation(conversation);
            } catch (cacheErr) {
              // Non-fatal, just log
              error('Error caching entities: %s', cacheErr instanceof Error ? cacheErr.message : String(cacheErr));
            }
            
            // Return response
            return {
              id: assistantMessage.id,
              content: cachedResponse,
              role: 'assistant',
              userId: assistantMessage.user_id ?? '',
              username: user.name ?? '',
              conversationId: conversation.id,
              parentId: assistantMessage.parent_id ?? undefined,
              type: 'text',
              metadata: assistantMessage.metadata as ChatMetadata,
              createdAt: assistantMessage.created_at,
              updatedAt: assistantMessage.updated_at
            };
          }
        } catch (cacheErr) {
          // Non-fatal, just log and continue with normal processing
          error('Error checking cache: %s', cacheErr instanceof Error ? cacheErr.message : String(cacheErr));
        }
      }

      const { userMessage, conversation, user } = await this.createInitialMessage(
        message,
        userId,
        conversationId,
        'sending'
      );
      initialUserMessage = userMessage;

      // Try to get agent response, fallback to echo if agent fails
      let response: string;
      let messageType: MessageType = 'text';
      let metadataObj: ChatMetadata;
      
      try {
        const agent = await this.initAgent();
        if (agent) {
          log('Querying LangGraph agent...');
          // Update non-streaming invocation to use the same format
          const result = await agent.invoke(
            { messages: [new HumanMessage(message)] }, 
            { 
              streaming: false,
              configurable: {
                thread_id: conversation.id,
                direct_response: true
              }
            }
          ) as string;
          
          // Format the response for better readability if it's a tool response
          response = this.formatToolResponse(result);
          
          // Add metadata for special responses
          messageType = message.toLowerCase().includes('list') && message.toLowerCase().includes('file')
            ? 'file-list'
            : 'text';
          
          metadataObj = createMetadata({
            type: messageType
          });
          
          log('Got response from LangGraph agent, content length: %d', response.length);

          // Update user message status to 'sent' after successful processing
          await this.prisma.chatMessage.update({
            where: { id: initialUserMessage.id },
            data: { status: 'sent' as MessageStatus }
          });
          
          // Cache deterministic responses for future use
          if (isDeterministic) {
            try {
              await chatCacheService.cacheLLMResponse(message, response, { temperature: 0 });
            } catch (cacheErr) {
              // Non-fatal, just log
              error('Error caching LLM response: %s', cacheErr instanceof Error ? cacheErr.message : String(cacheErr));
            }
          }
        } else {
          error('Agent not available');
          response = "I'm currently experiencing some technical difficulties with my tools. I can still chat, but some advanced features might not be available.";
          messageType = 'system';
          metadataObj = createMetadata({
            type: 'system',
            error: 'agent_unavailable'
          });

          // Even if agent is not available, mark user message as sent since we handled it
          await this.prisma.chatMessage.update({
            where: { id: initialUserMessage.id },
            data: { status: 'sent' as MessageStatus }
          });
        }
      } catch (err) {
        error('Error getting agent response: %s', err instanceof Error ? err.message : String(err));
        response = "I'm currently experiencing some technical difficulties. Please try again in a moment.";
        messageType = 'system';
        metadataObj = createMetadata({
          type: 'system',
          error: 'agent_error',
          errorMessage: err instanceof Error ? err.message : 'Unknown error'
        });

        // Update user message status to 'error' if agent fails
        await this.prisma.chatMessage.update({
          where: { id: initialUserMessage.id },
          data: { status: 'error' as MessageStatus }
        });
      }

      // Store assistant response with explicit 'sent' status
      const assistantMessage = await this.prisma.chatMessage.create({
        data: {
          content: response,
          role: 'assistant',
          conversation_id: conversation.id,
          user_id: userId,
          parent_id: initialUserMessage.id,
          metadata: metadataObj,
          status: 'sent' as MessageStatus
        }
      });
      
      // Cache messages and conversation
      try {
        await chatCacheService.cacheMessage(initialUserMessage);
        await chatCacheService.cacheMessage(assistantMessage);
        await chatCacheService.cacheConversation(conversation);
        
        // Check if user's conversations are cached and update if needed
        const cachedConversations = await chatCacheService.getUserConversations(userId);
        if (!cachedConversations) {
          // If not cached, fetch and cache for future requests
          const conversations = await this.prisma.conversation.findMany({
            where: { user_id: userId },
            orderBy: { last_message_at: 'desc' }
          });
          
          if (conversations.length > 0) {
            await chatCacheService.cacheUserConversations(userId, conversations);
          }
        } else {
          // Invalidate user conversations cache to include this new conversation
          await chatCacheService.invalidateUserConversations(userId);
        }
      } catch (cacheErr) {
        // Non-fatal, just log
        error('Error caching entities: %s', cacheErr instanceof Error ? cacheErr.message : String(cacheErr));
      }

      // Create response object
      return {
        id: assistantMessage.id,
        content: response,
        role: 'assistant',
        userId: assistantMessage.user_id ?? '',
        username: user.name ?? '',
        conversationId: conversation.id,
        parentId: assistantMessage.parent_id ?? undefined,
        type: messageType,
        metadata: assistantMessage.metadata as ChatMetadata,
        createdAt: assistantMessage.created_at,
        updatedAt: assistantMessage.updated_at
      };

    } catch (err) {
      error('Error processing message: %s', err instanceof Error ? err.message : String(err));
      
      // If we have a userMessage (meaning createInitialMessage succeeded), update its status
      if (initialUserMessage) {
        await this.prisma.chatMessage.update({
          where: { id: initialUserMessage.id },
          data: { status: 'error' as MessageStatus }
        }).catch(updateErr => {
          error('Failed to update message status: %s', updateErr instanceof Error ? updateErr.message : String(updateErr));
        });
      }
      
      throw err;
    }
  }

  /**
   * Create initial message structure with user, conversation, and first message
   */
  private async createInitialMessage(
    message: string,
    userId: string,
    conversationId?: string,
    status: MessageStatus = 'sending'
  ) {
    // Create or find user
    const user = await this.prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: `${userId}@example.com`, // Placeholder email
        name: userId
      },
      update: {}
    });

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId }
      });
    }
    
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          user_id: user.id,
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          last_message_at: new Date()
        }
      });
    } else {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { last_message_at: new Date() }
      });
    }

    // Store user message
    const userMessage = await this.prisma.chatMessage.create({
      data: {
        content: message,
        role: 'user',
        conversation_id: conversation.id,
        user_id: user.id,
        metadata: createMetadata({
          type: 'text'
        }),
        status
      }
    });

    return { userMessage, conversation, user };
  }

  /**
   * Clean up all resources used by the service
   */
  async cleanupResources() {
    this.streamingMessages.clear();
    if (this.agent) {
      try {
        log('Cleaning up agent resources...');
        await this.agent.cleanupResources();
        this.agent = null;
        log('Agent resources cleaned up successfully');
      } catch (err) {
        error('Error cleaning up agent: %s', err instanceof Error ? err.message : String(err));
      }
    }
  }
}
