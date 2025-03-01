import { PrismaClient } from '@prisma/client';
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

const log = debug('mcp:chat:langchain');
const error = debug('mcp:chat:langchain:error');

interface StreamingState {
  content: string;
  chunks: string[];
  messageId?: string;
  streamStartTime: string;
  streamEndTime?: string;
  streamDuration: number;
  isComplete: boolean;
  error?: Error;
}

export class ChatLangChainService {
  private agent: Awaited<ReturnType<typeof createLangGraph>> | null = null;
  private prisma: PrismaClient;
  private streamingMessages: Map<string, StreamingState> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private generateStreamId(): string {
    return crypto.randomUUID();
  }

  private async initAgent() {
    if (!this.agent) {
      try {
        log('Initializing LangGraph agent...');
        this.agent = await createLangGraph();
        log('LangGraph agent initialized successfully');
      } catch (err) {
        error('Failed to initialize LangGraph agent: %s', err instanceof Error ? err.message : String(err));
        return null;
      }
    }
    return this.agent;
  }

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
    log('Starting streaming message processing, streamId: %s', streamId);
    
    // Initialize streaming state
    this.streamingMessages.set(streamId, { 
      content: '', 
      chunks: [],
      streamStartTime,
      streamDuration: 0,
      isComplete: false
    });

    try {
      log('Creating initial message for user %s with streamId %s', userId, streamId);
      
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
        throw new Error('Agent initialization failed');
      }

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
            state.error = err;
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

      // Clean up streaming state
      this.streamingMessages.delete(streamId);

      // Return final message state
      return {
        id: assistantMessage.id,
        content: finalState.content,
        role: 'assistant',
        userId: assistantMessage.user_id ?? '',
        username: user.name ?? '',
        conversationId: conversation.id,
        parentId: assistantMessage.parent_id ?? undefined,
        type: 'text',
        metadata: createStreamingMetadata(streamId, 'complete', {
          type: 'text',
          chunkCount: finalState.chunks.length,
          totalLength: finalState.content.length,
          streamStartTime: finalState.streamStartTime,
          streamEndTime: finalState.streamEndTime,
          streamDuration: finalState.streamDuration
        }),
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
                streamStartTime: errorState.streamStartTime,
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

  async processMessage(
    message: string,
    userId: string,
    conversationId?: string
  ): Promise<ChatMessage> {
    let initialUserMessage;
    try {
      log('Processing message from user %s: %s', userId, message);

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
          response = result;
          
          // Add metadata for special responses
          messageType = message.toLowerCase().includes('list') && message.toLowerCase().includes('file')
            ? 'file-list'
            : 'text';
          
          metadataObj = createMetadata({
            type: messageType
          });
          
          log('Got response from LangGraph agent, content length: %d', result.length);

          // Update user message status to 'sent' after successful processing
          await this.prisma.chatMessage.update({
            where: { id: initialUserMessage.id },
            data: { status: 'sent' as MessageStatus }
          });
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
