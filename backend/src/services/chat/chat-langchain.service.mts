import { PrismaClient, Prisma } from '@prisma/client';
import debug from 'debug';
import crypto from 'crypto';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';

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

// Import statePersistence from an accessible scope
let statePersistence: any = null;
try {
  // This is a workaround - ideally we would use dependency injection
  statePersistence = global.statePersistence;
} catch (err) {
  // We'll handle missing statePersistence gracefully
  console.error('Warning: statePersistence not available in chat-langchain.service');
}

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
  lastChunkTime?: number;
  retryCount: number;
  isComplete?: boolean;
  completedViaCallback?: boolean;
  startTime?: number;
  endTime?: number;
  streamStartTime?: string;
  streamEndTime?: string;
  streamDuration?: number;
  metadata?: Record<string, any>;
}

/**
 * Define callback handler class
 */
class StreamingCallbackHandler extends BaseCallbackHandler {
  name = "streaming_handler";
  private tokensReceived = 0;

  constructor(
    private streamId: string,
    private streamingMessages: Map<string, StreamingState>,
    private enhancedOptions: StreamingOptions
  ) {
    super();
  }

  override async handleLLMNewToken(text: string | any): Promise<void> {
    // Extract text content from the token, which might be an object
    let safeText = '';

    try {
      // Parse text if it appears to be JSON format
      if (typeof text === 'string' && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            // Extract text from each item in array
            safeText = parsed
              .map(item => item.text || item.content || '')
              .filter(Boolean)
              .join('');
          } else if (parsed && typeof parsed === 'object') {
            // Extract text from object properties
            safeText = parsed.text || parsed.content || parsed.message || '';
           }
        } catch {
          // If parsing fails, use the original text
          safeText = text || '';
        }
      } else if (typeof text === 'string') {
        // Simple string case
        safeText = text;
      } else if (text && typeof text === 'object' && (text.text || text.content)) {
        // Handle structured object directly
        safeText = text.text || text.content || '';
      } else {
        // Fallback to stringify for other object types
        safeText = String(text || '');
      }
      
      // Clean up the text to remove JSON artifacts that might remain
      safeText = safeText.replace(/^\s*"/, '').replace(/"\s*$/, '');
    } catch (err) {
      log('Error extracting text from token: %s', err instanceof Error ? err.message : String(err));
      safeText = String(text || '');
    }
    
    this.tokensReceived++;
    
    log('Streaming token %d for stream %s, length: %d, content: %s', 
      this.tokensReceived, this.streamId, safeText.length, 
      safeText.substring(0, 20) + (safeText.length > 20 ? '...' : ''));
    
    // Always send the chunk, even if empty
    try {
      // Ensure we're actually sending data to the client
      await this.enhancedOptions.onChunk?.(safeText);
      log('Chunk sent successfully for stream %s, token %d', this.streamId, this.tokensReceived);
    } catch (err) {
      log('Error in onChunk callback: %s', err instanceof Error ? err.message : String(err));
      
      // Try again with a fallback approach for robustness
      try {
        if (typeof this.enhancedOptions.onChunk === 'function') {
          this.enhancedOptions.onChunk(safeText);
          log('Fallback chunk send succeeded for stream %s', this.streamId);
        }
      } catch (fallbackErr) {
        log('Fallback chunk send also failed: %s', 
            fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr));
      }
    }
    
    // Update streaming state
    const state = this.streamingMessages.get(this.streamId);
    if (state) {
      if (!state.isComplete) {
        state.content += safeText;
        state.chunks.push(safeText);
        state.lastChunkTime = Date.now();
      }
    } else {
      log('Warning: No streaming state found for stream %s when receiving token', this.streamId);
    }
  }

  override async handleLLMEnd(): Promise<void> {
    log('LLM stream ended for %s, received %d tokens total', this.streamId, this.tokensReceived);
    
    const state = this.streamingMessages.get(this.streamId);
    if (state) {
      // Mark as complete regardless of content
      state.isComplete = true;
      state.completedViaCallback = true;
      state.endTime = Date.now();
      
      // If no tokens were received, ensure we send at least something
      if (this.tokensReceived === 0 || state.content.trim().length === 0) {
        log('No meaningful content received for stream %s, sending fallback response', this.streamId);
        const fallbackResponse = "I apologize, but I'm having trouble generating a response right now. Please try again in a moment.";
        
        try {
          // Try sending a fallback response
          await this.enhancedOptions.onChunk?.(fallbackResponse);
          state.content = fallbackResponse;
          state.chunks.push(fallbackResponse);
          log('Sent fallback response for stream %s', this.streamId);
        } catch (err) {
          log('Error sending fallback response: %s', err instanceof Error ? err.message : String(err));
          
          // Try with fallback approach
          try {
            if (typeof this.enhancedOptions.onChunk === 'function') {
              this.enhancedOptions.onChunk(fallbackResponse);
              state.content = fallbackResponse;
              state.chunks.push(fallbackResponse);
              log('Fallback approach for sending response succeeded for stream %s', this.streamId);
            }
          } catch (fallbackErr) {
            log('Fallback approach also failed: %s', 
                fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr));
          }
        }
      }
      
      // Always call onComplete
      log('Calling onComplete for stream %s with content length %d', this.streamId, state.content.length);
      try {
        // Ensure completion is sent properly
        const completionResult = await this.enhancedOptions.onComplete?.();
        log('Completion event sent successfully for stream %s', this.streamId);
      } catch (err) {
        log('Error in onComplete callback: %s', err instanceof Error ? err.message : String(err));
        
        // Try with fallback approach
        try {
          if (typeof this.enhancedOptions.onComplete === 'function') {
            this.enhancedOptions.onComplete();
            log('Fallback completion event sent for stream %s', this.streamId);
          }
        } catch (fallbackErr) {
          log('Fallback completion event also failed: %s', 
              fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr));
        }
      }
    } else {
      log('Warning: No streaming state found for stream %s when ending', this.streamId);
      // Still try to complete even without state
      try {
        await this.enhancedOptions.onComplete?.();
        log('Completion event sent for stream %s without state', this.streamId);
      } catch (err) {
        log('Error in onComplete callback without state: %s', err instanceof Error ? err.message : String(err));
      }
    }
  }
}

/**
 * Unified chat service that combines functionality from both previous services.
 * Handles both streaming and non-streaming chat interactions, caching, and tool responses.
 */
export class ChatLangChainService {
  private agent: Awaited<ReturnType<typeof createLangGraph>> | null = null;
  private prisma: PrismaClient;
  private streamingMessages: Map<string, StreamingState> = new Map();
  // Cache system message and tool query detection function
  private _systemMessage: SystemMessage | null = null;
  private _isToolQuery: ((query: string) => boolean) | null = null;

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
        
        // Enhanced system prompt that explicitly mentions time-related tools
        const enhancedSystemPrompt = `You are a helpful AI assistant with access to various tools.
You MUST always provide a response to the user's message.

TOOLS: You have access to the following tools that you should use when appropriate:
- Time tools: Use get_current_time to check the current time when asked about time
- Weather tools: Use get-forecast to check weather when asked about weather
- File system tools: Use filesystem tools when asked about files
- Search tools: Use search tools when asked to find information online

When a user asks about the current time, ALWAYS use the get_current_time tool.
When a user asks about weather, ALWAYS use the get-forecast tool.

When using a tool, you will receive its output and can use that information in your response.
Always be helpful, concise, and clear.
When using tools, explain what you're doing and why.
If a tool returns an error, explain the error and suggest alternatives.

IMPORTANT: Never return an empty response. Always respond with some text, even if just acknowledging the message.
If you're unsure how to respond, provide a brief acknowledgment of the user's message.`;

        // Cache this for reuse
        this._systemMessage = new SystemMessage(enhancedSystemPrompt);
        
        // Create a function to detect tool-related queries
        this._isToolQuery = (query: string): boolean => {
          const lowerQuery = query.toLowerCase();
          
          // Time-related queries
          const isTimeQuery = 
            lowerQuery.includes('time') || 
            lowerQuery.includes('clock') || 
            lowerQuery.includes('hour') || 
            lowerQuery.includes('what time') ||
            lowerQuery.includes('current time');
          
          // Weather-related queries
          const isWeatherQuery =
            lowerQuery.includes('weather') ||
            lowerQuery.includes('forecast') || 
            lowerQuery.includes('temperature');
          return isTimeQuery || isWeatherQuery;
        };
        
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

  // Add this helper method to extract text from structured responses
  private extractTextFromResponse(response: any): string {
    if (typeof response === 'string') {
      // Try to parse as JSON if it looks like JSON
      if (response.trim().startsWith('[') || response.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(response);
          if (Array.isArray(parsed)) {
            return parsed
              .map(item => {
                if (typeof item === 'string') return item;
                return item.text || item.content || '';
              })
              .filter(Boolean)
              .join('\n');
          } else if (parsed && typeof parsed === 'object') {
            return parsed.text || parsed.content || response;
          }
        } catch {
          // If parsing fails, use original string
          return response;
        }
      }
      return response;
    }
    
    // Handle array of message objects (common LangGraph response format)
    if (Array.isArray(response)) {
      // Try to extract text from each message and join them
      return response
        .map(item => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            // Try to extract text content using common patterns
            return item.text || item.content || item.message || 
                   (item.data ? (item.data.content || item.data.text) : '') || 
                   JSON.stringify(item);
          }
          return '';
        })
        .filter(Boolean)
        .join('\n\n');
    }
    
    // Handle single object response
    if (response && typeof response === 'object') {
      // Try to extract text content using common patterns
      return response.text || response.content || response.message || 
             (response.data ? (response.data.content || response.data.text) : '') || 
             JSON.stringify(response);
    }
    
    // Fallback - convert to string
    return String(response || '');
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
      streamStartTime, // Initialize with current time
      isComplete: false, // Explicitly set to false initially
      retryCount: 0, // Add the missing required field
      metadata: {}
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
          user_id: typeof userId === 'string' ? userId : 'anonymous',
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
      log('Processing streaming message with agent');
      
      try {
        // Prepare message history with system message and user message
        const messageHistory = [];
        
        // Add system message
        messageHistory.push(this._systemMessage || new SystemMessage("You are a helpful AI assistant with access to various tools."));
        
        // Add user message
        messageHistory.push(new HumanMessage(message));
        
        // Create callback handler instance
        const callbackHandler = new StreamingCallbackHandler(
          streamId,
          this.streamingMessages,
          options
        );
        
        // Use invoke with streaming configuration
        const response = await agent.invoke(
          { messages: messageHistory },
          { 
            configurable: {
              thread_id: conversation.id,
              direct_response: false, // Never instruct to respond directly for tool queries
              force_streaming: true,
              standalone_question: true,
              callbacks: [callbackHandler],
              stream_id: streamId
            }
          }
        );

        // If we get here, stream completed successfully
        const finalState = this.streamingMessages.get(streamId);
        if (finalState) {
          finalState.isComplete = true;
          finalState.completedViaCallback = true;
          
          // Process the response, extracting text content properly
          let responseText = '';
          
          try {
            // Extract text from structured or plain text response
            responseText = this.extractTextFromResponse(response);

            // Remove JSON formatting artifacts if present
            responseText = responseText.replace(/^\s*\[\s*{"index":[^,]+,"type":"text","text":"/, '')
                                         .replace(/"\}\s*\]\s*$/, '')
                                         .replace(/\\n/g, '\n')
                                         .replace(/\\\\/g, '\\')
                                         .replace(/\\"/g, '"');

            log('Extracted response text, length: %d, preview: %s', 
              responseText.length, 
              responseText.substring(0, 50) + (responseText.length > 50 ? '...' : ''));
            
            if (responseText && responseText.length > 0) {
              finalState.content = responseText;
              
              // Send the full extracted response as a chunk to ensure client receives it
              try {
                await options.onChunk?.(responseText);
                log('Sent extracted response text as final chunk');
              } catch (chunkErr) {
                error('Error sending extracted response chunk: %s', chunkErr instanceof Error ? chunkErr.message : String(chunkErr));
              }
            }
          } catch (extractErr) {
            error('Error extracting text from response: %s', extractErr instanceof Error ? extractErr.message : String(extractErr));
            log('Original response type: %s, preview: %s', 
              typeof response, 
              JSON.stringify(response).substring(0, 100));
          }
          
          // If we still don't have content, provide a fallback
          if (!responseText || responseText.trim().length === 0) {
            // If we don't have content, provide a fallback
            const fallbackResponse = "I apologize, but I'm having trouble generating a response right now. Please try again in a moment.";
            finalState.content = fallbackResponse;
            
            try {
              await options.onChunk?.(fallbackResponse);
              log('Sent fallback response as final chunk');
            } catch (chunkErr) {
              error('Error sending fallback chunk: %s', chunkErr instanceof Error ? chunkErr.message : String(chunkErr));
            }
          }
          
          try {
            await options.onComplete();
            log('Successfully sent completion event after response processing');
          } catch (completeErr) {
            error('Error in final onComplete: %s', completeErr instanceof Error ? completeErr.message : String(completeErr));
          }
        }

      } catch (err) {
        error('Error during streaming: %s', err instanceof Error ? err.message : String(err));
        throw err;
      }

      // Get final state from streaming
      const finalState = this.streamingMessages.get(streamId);
      if (!finalState) {
        throw new Error('Streaming state was unexpectedly cleared');
      }

      // Capture all necessary data from state before any potential cleanup
      const finalChunks = [...finalState.chunks];
      const finalStreamStartTime = finalState.streamStartTime;
      const finalStreamEndTime = finalState.streamEndTime || new Date().toISOString();
      const finalStreamDuration = finalState.streamDuration || 
        (finalState.streamStartTime ? (Date.now() - new Date(finalState.streamStartTime as string).getTime()) : 0);
      const completedViaCallback = Boolean(finalState.completedViaCallback);
      
      // Make finalContent mutable since we might need to update it for empty responses
      let finalContent = finalState.content || '';

      // Check if stream was completed via callback - if not, log a warning and force call
      if (!completedViaCallback) {
        log('Warning: Stream %s completed without calling onComplete callback', streamId);
        console.warn(`[STREAM WARNING][${streamId}] Stream completed without onComplete callback`);
        
        // Force call the onComplete ourselves to ensure the frontend receives the completion event
        try {
          log('Forcing onComplete callback for stream %s', streamId);
          await options.onComplete();
        } catch (callbackErr) {
          error('Error forcing onComplete callback: %s', callbackErr instanceof Error ? callbackErr.message : String(callbackErr));
        }
      }

      // If we have an empty response, provide a fallback
      if (finalContent.length === 0) {
        finalContent = "I apologize, but I'm having trouble generating a response. Please try asking your question in a different way.";
        log('Using fallback response after streaming due to empty content');
        
        // Update the message in the database
        await this.prisma.chatMessage.update({
          where: { id: assistantMessage.id },
          data: {
            content: finalContent,
            status: 'sent' as MessageStatus
          }
        });
      }

      // Cache messages and conversation
      try {
        await chatCacheService.cacheMessage(userMessage);
        await chatCacheService.cacheMessage({
          ...assistantMessage,
          content: finalContent,
          status: 'sent'
        });
        await chatCacheService.cacheConversation(conversation);
      } catch (cacheErr) {
        // Non-fatal, just log
        error('Error caching streaming entities: %s', cacheErr instanceof Error ? cacheErr.message : String(cacheErr));
      }

      // Ensure streaming state is properly marked as completed in the persistence layer
      if (finalState && streamId) {
        try {
          // Replace call to external service with direct Prisma update
          await this.prisma.chatMessage.update({
            where: { id: assistantMessage.id },
            data: {
              content: finalContent,
              metadata: {
                streamStatus: 'complete',
                streamId,
                type: 'text',
                chunkCount: finalChunks.length,
                totalLength: finalContent.length,
                streamStartTime: finalStreamStartTime,
                streamEndTime: finalStreamEndTime,
                streamDuration: finalStreamDuration,
                timestamp: new Date().toISOString(),
                fromCache: true
              },
              status: 'sent'
            }
          });
          
          // Also update the streaming state in the persistence layer to ensure proper merging
          if (statePersistence) {
            try {
              await statePersistence.saveStreamingState(streamId, {
                completed: true,
                isComplete: true,
                partialResponse: finalContent,
                messageId: assistantMessage.id,
                conversationId: conversation.id,
                lastUpdated: new Date().toISOString()
              });
              
              log('Stream state marked as completed in persistence layer for %s', streamId);
              
              // Give some time for the state to be processed before cleanup
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (persistErr) {
              // Non-fatal, just log
              error('Error updating streaming state: %s', 
                    persistErr instanceof Error ? persistErr.message : String(persistErr));
            }
          } else {
            log('State persistence not available, skipping streaming state update');
          }
          
          log('Stream state marked as completed for %s', streamId);
        } catch (err) {
          error('Failed to mark streaming state as completed: %s', 
                err instanceof Error ? err.message : String(err));
        }
      }

      // Clean up streaming state AFTER all processing is complete
      log('Cleaning up stream state for %s', streamId);
      this.streamingMessages.delete(streamId);

      // Return final message state with guaranteed content (no undefined)
      return {
        id: assistantMessage.id,
        content: finalContent || '', // Ensure content is never undefined
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
          chunkCount: finalChunks.length,
          totalLength: finalContent.length,
          streamStartTime: finalStreamStartTime,
          streamEndTime: finalStreamEndTime,
          streamDuration: finalStreamDuration,
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
                user_id: typeof userId === 'string' ? userId : 'anonymous',
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
      
      // Prepare message history with system message and user message
      const messageHistory = [];
      
      // Add system message
      messageHistory.push(this._systemMessage || new SystemMessage("You are a helpful AI assistant with access to various tools."));
      // Add user message
      messageHistory.push(new HumanMessage(message));
      let messageType: MessageType = 'text';
      let metadataObj: ChatMetadata;
      
      try {
        const agent = await this.initAgent();
        if (agent) {
          log('Querying LangGraph agent...');
          // Update non-streaming invocation to use the same format
          
          // Determine if this is a tool-related query to adjust direct_response setting
          // const isToolQuery = this._isToolQuery?.(message) || false;
          // Only calculate if used
          
          const result = await agent.invoke(
            { messages: messageHistory }, 
            { 
              streaming: false,
              configurable: {
                thread_id: conversation.id,
                direct_response: false // Never use direct_response for tool queries
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
          user_id: typeof userId === 'string' ? userId : 'anonymous',
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
            where: { user_id: typeof userId === 'string' ? userId : 'anonymous' },
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
   * Process a message with streaming options
   * @param message User message
   * @param options Streaming options
   * @returns Processed chat message
   */
  async processMessageWithOptions(
    message: string,
    options: {
      history?: any[];
      streaming?: boolean;
      onChunk?: (chunk: string) => Promise<void> | void;
      onComplete?: () => Promise<void> | void;
      onError?: (error: Error) => Promise<void> | void;
      configurable?: {
        thread_id?: string;
        conversation_id?: string;
        userId?: string;
        [key: string]: any;
      };
    }
  ): Promise<ChatMessage> {
    try {
      log('Processing message with streaming options: %s', message.substring(0, 50) + (message.length > 50 ? '...' : ''));
      
      // Extract userId and conversationId from configurable
      const userId = options.configurable?.userId || 'anonymous';
      const conversationId = options.configurable?.conversation_id;
      // Unused variable: threadId - keeping commented in case we need it later
      // const threadId = options.configurable?.thread_id;
      
      log('Using extracted userId: %s, conversationId: %s', 
        userId, conversationId || 'none');
      
      if (options.streaming) {
        // Use streaming version with callbacks
        return this.processStreamingMessage(
          message,
          userId,
          {
            onChunk: options.onChunk ? options.onChunk : (_chunk: string) => {},
            onComplete: options.onComplete ? options.onComplete : () => {},
            onError: options.onError ? options.onError : (_error: Error) => {}
          },
          conversationId
        );
      } else {
        // Use non-streaming version
        return this.processMessage(message, userId, conversationId);
      }
    } catch (err) {
      error('Error processing message with options: %s', err instanceof Error ? err.message : String(err));
      if (options.onError) {
        await options.onError(err instanceof Error ? err : new Error(String(err)));
      }
      throw err;
    }
  }

  /**
   * Create initial message structure with user, conversation, and first message
   * @param message User's message content
   * @param userId User's ID (string)
   * @param conversationId Optional conversation ID
   * @param status Message status
   * @returns Structure with user, conversation, and message objects
   */
  private async createInitialMessage(
    message: string,
    userId: string,
    conversationId?: string,
    status: MessageStatus = 'sending'
  ) {
    // Ensure userId is a string
    if (typeof userId !== 'string') {
      error('Invalid userId type: %s', typeof userId);
      // Default to anonymous if userId is not a string
      userId = 'anonymous';
    }

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
