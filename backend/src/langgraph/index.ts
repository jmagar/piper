import { convertMcpToLangchainTools } from '@h1deya/langchain-mcp-tools';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent, type AgentState } from '@langchain/langgraph/prebuilt';
import type { Callbacks } from '@langchain/core/callbacks/manager';
import debug from 'debug';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { initChatModel } from '../init-chat-model.js';
import { loadConfig } from '../load-config.js';

const log = debug('mcp:langgraph');
const error = debug('mcp:langgraph:error');

// Get absolute path to config file
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const configPath = join(__dirname, '..', '..', '..', 'llm_mcp_config.json5');

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
    [key: string]: unknown;
  };
}

/**
 * Creates a LangGraph agent with proper state management and tool handling
 */
export async function createLangGraph() {
  // Load config and initialize model
  const config = loadConfig(configPath);
  
  // Initialize base model
  const llm = initChatModel({
    modelProvider: config.llm.model_provider,
    model: config.llm.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.max_tokens
  });
  
  // Initialize MCP tools
  const { tools, cleanup: cleanupTools } = await convertMcpToLangchainTools(
    config.mcp_servers,
    { logLevel: 'info' }
  );

  // Create conversation store
  const conversations = new Map<string, ConversationHistory>();

  // System message for context
  const baseSystemPrompt = `You are a helpful AI assistant with access to various tools.
You MUST always provide a response to the user's message.
When using a tool, you will receive its output and can use that information in your response.
Always be helpful, concise, and clear.
When using tools, explain what you're doing and why.
If a tool returns an error, explain the error and suggest alternatives.
IMPORTANT: Never return an empty response. Always respond with some text, even if just acknowledging the message.
If you're unsure how to respond, provide a brief acknowledgment of the user's message.`;

  const directResponsePrompt = `IMPORTANT: You must respond directly to the user's query. Do not use any tools unless absolutely necessary. Provide a helpful, direct answer.`;

  // Create the agent
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
            await options.streamingOptions?.onChunk?.(token);
          },
          handleLLMError: async (errorObj: Error) => {
            error('Streaming error: %s', errorObj.message);
            error('Error stack: %s', errorObj.stack || 'No stack trace');
            error('Current streamed content length: %d', streamedContent.length);
            error('Last few tokens (if any): %s', streamedContent.slice(-50));
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
            await options.streamingOptions?.onComplete?.();
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
          
          const agentState: AgentState = await agent.invoke(
            { messages: history.messages },
            { 
              configurable: { 
                thread_id: conversationId,
                ...options.configurable 
              },
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
      conversations.clear();
      await cleanupTools();
    }
  };
} 