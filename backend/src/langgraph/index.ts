import { convertMcpToLangchainTools } from '@h1deya/langchain-mcp-tools';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent, type AgentState } from '@langchain/langgraph/prebuilt';
import type { Callbacks } from '@langchain/core/callbacks/manager';
import type { StructuredTool } from '@langchain/core/tools';
import debug from 'debug';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

import { initChatModel } from '../init-chat-model.js';
import { loadConfig } from '../load-config.js';
// Import not currently used, but kept for reference
// import { LangGraphStatePersistence } from '../services/langgraph/state-persistence.mjs';
import { CustomStateManager } from '../services/langgraph/custom-state-manager.js';

const log = debug('mcp:langgraph');
const error = debug('mcp:langgraph:error');

// Use the correct path resolution logic for the config file
const configPath = join(
  process.cwd().endsWith('/backend') 
    ? join(process.cwd(), '..') 
    : process.cwd(),
  'llm_mcp_config.json5'
);

interface ConversationHistory {
  messages: BaseMessage[];
  lastUpdated: Date;
}

interface StreamingOptions {
  onChunk?: (chunk: string) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
  onComplete?: () => void | Promise<void>;
}

interface InvokeOptions {
  streaming?: boolean;
  streamingOptions?: StreamingOptions;
  configurable?: {
    thread_id?: string;
    message_id?: string;
    conversation_id?: string;
    direct_response?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Extended options for MCP tool initialization
 */
interface ExtendedMcpOptions {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  initTimeout?: number;
  continueOnError?: boolean;
}

/**
 * Extended result from MCP tool initialization
 */
interface ExtendedMcpResult {
  tools: StructuredTool[];
  cleanup: () => Promise<void>;
  failedServers?: string[];
}

/**
 * Creates a LangGraph agent with proper state management and tool handling
 */
export async function createLangGraph(prismaClient?: PrismaClient) {
  // Load config and initialize model
  // Clear any existing statePersistence to avoid potential conflicts
  (global as any).statePersistence = null;
  const config = loadConfig(configPath);
  
  console.log('==== LangGraph Initialization ====');
  console.log('Loading configuration from:', configPath);
  console.log('Model provider:', config.llm.model_provider);
  console.log('Model:', config.llm.model);
  console.log('Temperature:', config.llm.temperature);
  console.log('Max tokens:', config.llm.max_tokens);
  
  // Initialize base model
  log('Initializing LLM model with provider %s and model %s', config.llm.model_provider, config.llm.model);
  let llm;
  try {
    llm = initChatModel({
      modelProvider: config.llm.model_provider,
      model: config.llm.model,
      temperature: config.llm.temperature,
      maxTokens: config.llm.max_tokens
    });
    log('✅ LLM model initialized successfully');
    console.log('✅ LLM model initialized successfully');
  } catch (err) {
    error('⛔ Failed to initialize LLM model: %s', err instanceof Error ? err.message : String(err));
    console.error('⛔ CRITICAL ERROR: Failed to initialize LLM model:', err instanceof Error ? err.message : String(err));
    if (err instanceof Error && err.stack) {
      console.error('Error stack:', err.stack);
    }
    
    throw new Error(`Failed to initialize LLM model: ${err instanceof Error ? err.message : String(err)}`);
  }
  
  // Initialize MCP tools with enhanced error handling
  let tools: StructuredTool[] = [];
  let cleanupTools = async () => {};
  try {
    const serverCount = Object.keys(config.mcp_servers).length;
    log('Initializing MCP tools from %d configured servers', serverCount);
    console.log(`Initializing ${serverCount} MCP tool servers...`);
    
    // Cast to custom options and result types
    const mcpResult = await convertMcpToLangchainTools(
      config.mcp_servers,
      { 
        logLevel: 'info',
        // Additional options for graceful degradation
        initTimeout: 10000, // 10 seconds timeout for each server
        continueOnError: true // Continue even if some servers fail
      } as ExtendedMcpOptions
    ) as ExtendedMcpResult;
    
    tools = mcpResult.tools;
    cleanupTools = mcpResult.cleanup;
    
    // Log which servers are operational vs failed
    if (mcpResult.failedServers && mcpResult.failedServers.length > 0) {
      const failedServerCount = mcpResult.failedServers.length;
      const successServerCount = serverCount - failedServerCount;
      
      error('⚠️ %d/%d MCP servers failed to initialize and will be skipped: %s', 
        failedServerCount, serverCount, mcpResult.failedServers.join(', '));
      console.warn(`⚠️ ${failedServerCount}/${serverCount} MCP servers failed to initialize`);
      console.warn('Failed servers:', mcpResult.failedServers.join(', '));
      console.log(`✅ Successfully initialized ${tools.length} MCP tools from ${successServerCount} available servers`);
    } else {
      log('✅ Successfully initialized %d MCP tools from all %d servers', tools.length, serverCount);
      console.log(`✅ Successfully initialized ${tools.length} MCP tools from all ${serverCount} servers`);
    }

    // Truncate tool descriptions to ensure they don't exceed OpenAI's limits
    tools = truncateToolDescriptions(tools);
    log('Tool descriptions truncated to comply with API limits');
  } catch (err) {
    error('⛔ Error during MCP tools initialization: %s', err instanceof Error ? err.message : String(err));
    console.error('⛔ CRITICAL ERROR during MCP tools initialization:', err instanceof Error ? err.message : String(err));
    if (err instanceof Error && err.stack) {
      console.error('Error stack:', err.stack);
    }
    console.warn('⚠️ Continuing with limited or no tools available');
    tools = []; // Start with empty tools rather than failing
  }

  /**
   * Truncates tool descriptions to ensure they don't exceed OpenAI's maximum length (1024 characters)
   * @param tools The array of structured tools to process
   * @returns The array of tools with truncated descriptions
   */
  function truncateToolDescriptions(tools: StructuredTool[]): StructuredTool[] {
    const MAX_DESCRIPTION_LENGTH = 1024;
    
    return tools.map(tool => {
      // Create a shallow copy of the tool - we'll only modify what's needed
      const modifiedTool = { ...tool } as StructuredTool;
      
      try {
        // Handle direct description property if it exists
        if (typeof modifiedTool.description === 'string' && 
            modifiedTool.description.length > MAX_DESCRIPTION_LENGTH) {
          // Since we can't directly modify the read-only property, use Object.defineProperty
          Object.defineProperty(modifiedTool, 'description', {
            value: modifiedTool.description.substring(0, MAX_DESCRIPTION_LENGTH - 3) + '...',
            writable: false,
            enumerable: true,
            configurable: true
          });
          
          log('Truncated direct description for tool "%s" from %d to %d characters', 
              modifiedTool.name, 
              tool.description.length, 
              modifiedTool.description.length);
        }
        
        // Handle schema.description if it exists
        if (modifiedTool.schema && 
            typeof modifiedTool.schema === 'object' && 
            modifiedTool.schema !== null) {
          
          // Access schema safely with type assertions
          const schema = modifiedTool.schema as { description?: string };
          
          if (typeof schema.description === 'string' && 
              schema.description.length > MAX_DESCRIPTION_LENGTH) {
            
            // Create a safe copy of the schema
            const schemaCopy = { ...schema };
            schemaCopy.description = schema.description.substring(0, MAX_DESCRIPTION_LENGTH - 3) + '...';
            
            // Replace the schema object with our modified copy
            Object.defineProperty(modifiedTool, 'schema', {
              value: schemaCopy,
              writable: true,
              enumerable: true,
              configurable: true
            });
            
            log('Truncated schema description for tool "%s" from %d to %d characters', 
                modifiedTool.name,
                schema.description.length,
                schemaCopy.description.length);
          }
        }
      } catch (err) {
        // If any error occurs during truncation, log and return the original tool
        error('Error truncating description for tool "%s": %s', 
          tool.name, 
          err instanceof Error ? err.message : String(err));
      }
      
      return modifiedTool;
    });
  }

  // Create conversation store
  const conversations = new Map<string, ConversationHistory>();
  
  // Initialize Prisma client if not provided
  const prisma = prismaClient || new PrismaClient();
  
  // Initialize the CustomStateManager that will handle both memory and persistence
  const stateManager = new CustomStateManager(prisma);
  
  try {
    // Expose the stateManager to the global scope for chat-langchain.service.mts to access
    (global as any).statePersistence = stateManager;
    log('✅ Exported state persistence to global scope for cross-service access');
    
    // Verify stateManager is working by testing a simple get/set operation
    const testThreadId = 'test-thread-' + Date.now();
    await stateManager.set({ configurable: { thread_id: testThreadId } }, { test: true });
    const testResult = await stateManager.get({ configurable: { thread_id: testThreadId } });
    log('✅ State persistence verified working: %s', testResult ? 'YES' : 'NO');
  } catch (stateErr) {
    error('⚠️ Failed to initialize or verify state persistence: %s', stateErr instanceof Error ? stateErr.message : String(stateErr));
    console.warn('⚠️ State persistence initialization failed - tool usage may be affected');
  }

  // System message for context
  const baseSystemPrompt = `You are a helpful AI assistant with access to various tools.
You MUST always provide a response to the user's message.
When using a tool, you will receive its output and can use that information in your response.
Always be helpful, concise, and clear.
When using tools, explain what you're doing and why.
If a tool returns an error, explain the error and suggest alternatives.
IMPORTANT: Never return an empty response. Always respond with some text, even if just acknowledging the message.
If you're unsure how to respond, provide a brief acknowledgment of the user's message.`;

  const directResponsePrompt = `IMPORTANT: For general knowledge questions, you can respond directly. 
However, for functional requests that require external information or actions, you MUST use the appropriate tools.

ALWAYS use tools for these types of requests:
- Time-related queries → use get_current_time tool
- Weather information → use get-forecast tool
- File operations → use the filesystem tools
- Web searches → use web_search or brave_web_search tools
- System information → use the shell tools
DO NOT try to guess information that requires tools - use the tools instead.`;

  // Create the agent with MEMORY_SAVER to handle in-memory state
  // We'll manage persistence separately with our CustomStateManager
  const agent = createReactAgent({
    llm,
    tools,
    checkpointSaver: new MemorySaver(),
  });

  return {
    agent,
    async invoke(
      input: string | { messages: BaseMessage[] }, 
      conversationIdOrOptions: string | InvokeOptions = 'default', 
      optionsParam?: InvokeOptions
    ) {
      try {
        // Handle flexible parameter types
        const conversationId = typeof conversationIdOrOptions === 'string' 
          ? conversationIdOrOptions 
          : 'default';
        
        const options = typeof conversationIdOrOptions === 'string' 
          ? optionsParam ?? {} 
          : conversationIdOrOptions;
        
        log('Processing message for conversation %s', conversationId);
        
        // Check for existing state in Redis/PostgreSQL
        const threadId = options.configurable?.thread_id as string || `${conversationId}:${Date.now()}`;
        if (threadId) {
          try {
            const existingState = await stateManager.get({
              configurable: {
                thread_id: threadId,
                conversation_id: conversationId
              }
            });
            
            if (existingState) {
              log('Found existing state for thread %s in persistent storage', threadId);
              
              // Try to restore conversation from state if available
              if (existingState.messages && Array.isArray(existingState.messages)) {
                log('Restoring conversation from persisted state');
                
                // Convert messages from state to LangChain format
                const restoredMessages: BaseMessage[] = [];
                for (const msg of existingState.messages) {
                  if (msg.role === 'system') {
                    restoredMessages.push(new SystemMessage(msg.content));
                  } else if (msg.role === 'human') {
                    restoredMessages.push(new HumanMessage(msg.content));
                  } else if (msg.role === 'assistant') {
                    restoredMessages.push(new AIMessage(msg.content));
                  }
                }
                
                // Create or update history with restored messages
                if (restoredMessages.length > 0) {
                  log('Restored %d messages from state', restoredMessages.length);
                  conversations.set(conversationId, {
                    messages: restoredMessages,
                    lastUpdated: new Date()
                  });
                }
              }
            }
          } catch (stateErr) {
            error('Error checking thread state: %s', stateErr instanceof Error ? stateErr.message : String(stateErr));
            // Continue with in-memory state only
          }
        } else {
          // Generate a new thread ID if none was provided
          options.configurable = options.configurable || {};
          options.configurable.thread_id = `${conversationId}:${Date.now()}`;
          log('Created new thread ID: %s', options.configurable.thread_id);
        }
        
        // Get or create conversation history
        let history = conversations.get(conversationId);
        if (!history) {
          // Create a new history with the appropriate system message
          let systemPrompt = baseSystemPrompt;
          
          // If direct_response is configured, include that instruction in the initial system message
          if (options.configurable?.direct_response) {
            log('Adding direct response instruction to system prompt');
            systemPrompt = `${baseSystemPrompt}\n\n${directResponsePrompt}`;
          }
          
          history = {
            messages: [new SystemMessage(systemPrompt)],
            lastUpdated: new Date()
          };
          conversations.set(conversationId, history);
        } else if (options.configurable?.direct_response) {
          // For existing conversations with direct_response, rebuild the conversation history
          log('Handling direct response for existing conversation');
          const systemMsg = history.messages.find(msg => msg instanceof SystemMessage);
          const userMessages = history.messages.filter(msg => msg instanceof HumanMessage || msg instanceof AIMessage);
          
          // Completely replace history with new messages array
          let systemPrompt = baseSystemPrompt;
          if (systemMsg) {
            // Try to preserve any custom instructions from the original system message
            const originalContent = typeof systemMsg.content === 'string' ? systemMsg.content : '';
            if (originalContent && originalContent !== baseSystemPrompt) {
              systemPrompt = originalContent;
            }
          }
          
          // Add direct response instruction if not already included
          if (!systemPrompt.includes(directResponsePrompt)) {
            systemPrompt = `${systemPrompt}\n\n${directResponsePrompt}`;
          }
          
          // Create new history with updated system message and preserved user messages
          history.messages = [new SystemMessage(systemPrompt), ...userMessages];
        }

        // Add new message to history
        if (typeof input === 'string') {
          const newMessage = new HumanMessage(input);
          history.messages.push(newMessage);
        } else if (input.messages && input.messages.length > 0) {
          // If we're receiving a messages array directly, append the last message
          // (assuming it's the new user message)
          const lastMessage = input.messages[input.messages.length - 1];
          if (lastMessage instanceof HumanMessage) {
            history.messages.push(lastMessage);
          }
        }
        
        history.lastUpdated = new Date();

        // Create callback handlers with enhanced logging
        let streamedContent = '';
        const callbacks: Callbacks = options.streaming ? [{
          handleLLMNewToken: async (token: string) => {
            log('Streaming token: %d chars, content: "%s"', token.length, token.substring(0, 20) + (token.length > 20 ? '...' : ''));
            streamedContent += token;
            
            // Store streaming state using our CustomStateManager
            if (options.configurable?.thread_id && streamedContent.length > 0 && 
                streamedContent.length % 5 === 0) {
              try {
                const threadId = options.configurable.thread_id as string;
                const messageId = options.configurable.message_id as string || `msg-${Date.now()}`;
                
                // Save streaming state through our custom state manager
                await stateManager.saveStreamingState(
                  threadId, 
                  streamedContent,
                  {
                    messageId,
                    chunkCount: Math.floor(streamedContent.length / 5),
                    conversationId
                  }
                );
                
                log('Saved partial streaming state for thread %s, content length: %d', 
                   threadId, streamedContent.length);
              } catch (persistErr) {
                error('Error persisting partial streaming state: %s', 
                      persistErr instanceof Error ? persistErr.message : String(persistErr));
                // Non-fatal, continue streaming
              }
            }
            
            await options.streamingOptions?.onChunk?.(token);
          },
          handleLLMError: async (errorObj: Error) => {
            error('Streaming error: %s', errorObj.message);
            error('Error stack: %s', errorObj.stack || 'No stack trace');
            error('Current streamed content length: %d', streamedContent.length);
            error('Last few tokens (if any): %s', streamedContent.slice(-50));
            
            // Save error state for potential recovery
            if (options.configurable?.thread_id && streamedContent.length > 0) {
              try {
                const threadId = options.configurable.thread_id as string;
                
                // Convert messages to serializable format
                const serializableMessages = history.messages.map(msg => ({
                  role: msg._getType(),
                  content: msg.content
                }));
                
                // Add error message
                serializableMessages.push({
                  role: 'ai',
                  content: streamedContent,
                });
                
                // Save state with error
                await stateManager.set(
                  {
                    configurable: {
                      thread_id: threadId,
                      conversation_id: conversationId
                    }
                  },
                  {
                    messages: serializableMessages,
                    lastUpdated: new Date().toISOString(),
                    streaming: false,
                    partialResponse: streamedContent
                  }
                );
                
                log('Saved error streaming state for thread %s', threadId);
              } catch (persistErr) {
                error('Error persisting streaming error state: %s', 
                      persistErr instanceof Error ? persistErr.message : String(persistErr));
              }
            }
            
            await options.streamingOptions?.onError?.(errorObj);
          },
          handleLLMEnd: async () => {
            log('Streaming complete, total content length: %d', streamedContent.length);
            
            // Add the streamed message to history
            if (streamedContent.length > 0) {
              const streamedMessage = new AIMessage(streamedContent);
              history.messages.push(streamedMessage);
              history.lastUpdated = new Date();
              log('Added message to history, content begins with: %s', streamedContent.substring(0, 50) + (streamedContent.length > 50 ? '...' : ''));
            } else {
              // Provide a fallback directly in the callbacks
              const messageText = typeof input === 'string' 
                ? input 
                : 'your message';
              const fallbackContent = `I apologize, but I seem to be having trouble generating a response to your message: "${messageText}". Could you please try asking in a different way?`;
              streamedContent = fallbackContent;
              const fallbackMessage = new AIMessage(fallbackContent);
              history.messages.push(fallbackMessage);
              history.lastUpdated = new Date();
              log('Using fallback response in handleLLMEnd due to empty content');
              
              // Debug log history state
              log('DEBUG - History state:');
              history.messages.forEach((msg, idx) => {
                log('Message %d: type=%s, contentLength=%d', 
                  idx, 
                  msg.constructor.name, 
                  typeof msg.content === 'string' ? msg.content.length : -1
                );
              });
            }
            
            // Complete streaming state using our custom state manager
            if (options.configurable?.thread_id) {
              try {
                const threadId = options.configurable.thread_id as string;
                const messageId = options.configurable.message_id as string || `msg-${Date.now()}`;
                
                // Complete the streaming state
                await stateManager.completeStreamingState(
                  threadId,
                  streamedContent,
                  {
                    messageId,
                    conversationId
                  }
                );
                
                // Also save the full state for future calls
                await stateManager.set(
                  {
                    configurable: {
                      thread_id: threadId,
                      conversation_id: conversationId
                    }
                  },
                  {
                    messages: history.messages.map(msg => {
                      const role = msg._getType();
                      // Properly handle tool calls/results for persistence
                      if (role === "ai" && typeof msg.content === "object" && Array.isArray(msg.content)) {
                        // This is likely a tool call - preserve the full object structure
                        return {
                          role,
                          content: msg.content
                        };
                      }
                      return { role, content: msg.content };
                    }),
                    lastUpdated: history.lastUpdated.toISOString(),
                    streaming: false,
                    completed: true
                  }
                );
                
                log('Persisted completed streaming state for thread %s', threadId);
              } catch (persistErr) {
                error('Error persisting completed streaming state: %s', 
                      persistErr instanceof Error ? persistErr.message : String(persistErr));
              }
            }

            // Make sure onComplete is always called, even if there's no content
            if (options.streamingOptions?.onComplete) {
              log('Calling onComplete callback from handleLLMEnd');
              await options.streamingOptions.onComplete();
            }
          }
        }] : [];

        // Invoke agent with history
        try {
          log('Invoking agent with %d messages in history', history.messages.length);
          history.messages.forEach((msg, idx) => {
            log('Input message %d: type=%s, content=%s', 
              idx, 
              msg.constructor.name,
              typeof msg.content === 'string' 
                ? (msg.content.length > 30 ? msg.content.substring(0, 30) + '...' : msg.content)
                : 'non-string content'
            );
          });
          
          // Make sure the threadId is set in configurable
          if (options.configurable) {
            options.configurable.thread_id = options.configurable.thread_id || threadId;
            options.configurable.conversation_id = options.configurable.conversation_id || conversationId;
          }
          
          const agentState: AgentState = await agent.invoke(
            { messages: history.messages },
            { 
              configurable: options.configurable,
              callbacks
            }
          );
          
          log('Agent invocation completed, got %d messages back', agentState.messages.length);
          
          // If not streaming, get the last message and add to history
          if (!options.streaming) {
            const lastMessage = agentState.messages[agentState.messages.length - 1];
            log('Last message content type: %s, length: %d', 
              typeof lastMessage.content, 
              typeof lastMessage.content === 'string' ? lastMessage.content.length : -1
            );
            history.messages.push(lastMessage);
            history.lastUpdated = new Date();
            
            // Save state for future calls - using our CustomStateManager
            if (options.configurable?.thread_id) {
              try {
                await stateManager.set(
                  {
                    configurable: {
                      thread_id: options.configurable.thread_id,
                      conversation_id: conversationId
                    }
                  },
                  {
                    messages: history.messages.map(msg => {
                      const role = msg._getType();
                      // Special handling for tool call messages
                      if (role === "ai" && typeof msg.content === "object" && Array.isArray(msg.content)) {
                        return { role, content: msg.content };
                      }
                      return { role, content: msg.content };
                    }),
                    lastUpdated: history.lastUpdated.toISOString(),
                    completed: true
                  }
                );
                log('Saved completed state for thread %s', options.configurable.thread_id);
              } catch (saveErr) {
                error('Error saving completed state: %s', saveErr instanceof Error ? saveErr.message : String(saveErr));
              }
            }
            
            return typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);
          }
        } catch (err) {
          error('Agent invocation error: %s', err instanceof Error ? err.message : String(err));
          error('Error stack: %s', err instanceof Error ? (err.stack || 'No stack trace') : 'No stack trace');
          error('Current history state:');
          history.messages.forEach((msg, idx) => {
            error('Message %d: type=%s', idx, msg.constructor.name);
          });
          throw err;
        }

        // For streaming, return the accumulated content
        return streamedContent;
      } catch (error) {
        console.error('Error in LangGraph invoke:', error);
        throw error;
      }
    },

    /**
     * Clear conversation history for a specific conversation or all conversations
     */
    async clearHistory(conversationId?: string) {
      if (conversationId) {
        conversations.delete(conversationId);
      } else {
        conversations.clear();
      }
      
      // Also clear persistent state if conversationId is provided
      if (conversationId) {
        try {
          // Get all thread IDs for this conversation and delete them
          // const threadIds = await stateManager.delete(conversationId);
          await stateManager.delete(conversationId);
          log('Cleared persistent state for thread %s', conversationId);
        } catch (clearErr) {
          error('Error clearing persistent state: %s', clearErr instanceof Error ? clearErr.message : String(clearErr));
        }
      }
    },

    /**
     * Get conversation history for a specific conversation
     */
    async getHistory(conversationId: string) {
      const history = conversations.get(conversationId);
      return history?.messages ?? [];
    },

    /**
     * Cleanup all resources including conversations and tools
     */
    async cleanupResources() {
      try {
        // Existing cleanups
        await cleanupTools();
        conversations.clear();
        
        // Close Prisma client if we created it internally
        if (!prismaClient) {
          await prisma.$disconnect();
        }
        
        log('Cleaned up all resources');
      } catch (err) {
        error('Error in cleanup: %s', err instanceof Error ? err.message : String(err));
      }
    }
  };
}