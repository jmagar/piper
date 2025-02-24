import { convertMcpToLangchainTools } from '@h1deya/langchain-mcp-tools';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

import { initChatModel } from '../init-chat-model.js';
import { loadConfig } from '../load-config.js';

interface ConversationHistory {
  messages: BaseMessage[];
  lastUpdated: Date;
}

/**
 * Creates a LangGraph agent with proper state management and tool handling
 */
export async function createLangGraph() {
  // Load config and initialize model
  const config = loadConfig('../llm_mcp_config.json5');
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

  // Create the agent
  const agent = createReactAgent({
    llm,
    tools,
    checkpointSaver: new MemorySaver(),
  });

  // System message for context
  const systemMessage = new SystemMessage(`You are a helpful AI assistant with access to various tools.
When using a tool, you will receive its output and can use that information in your response.
Always be helpful, concise, and clear.
When using tools, explain what you're doing and why.
If a tool returns an error, explain the error and suggest alternatives.`);

  return {
    agent,
    async invoke(message: string, conversationId = 'default') {
      try {
        // Get or create conversation history
        let history = conversations.get(conversationId);
        if (!history) {
          history = {
            messages: [systemMessage],
            lastUpdated: new Date()
          };
          conversations.set(conversationId, history);
        }

        // Add new message to history
        const newMessage = new HumanMessage(message);
        history.messages.push(newMessage);
        history.lastUpdated = new Date();

        // Invoke agent with history
        const agentState = await agent.invoke(
          { messages: history.messages },
          { configurable: { thread_id: conversationId } }
        );

        // Get the last message (AI's response)
        const lastMessage = agentState.messages[agentState.messages.length - 1];
        history.messages.push(lastMessage);
        history.lastUpdated = new Date();

        // Return the response
        const result = lastMessage.content;
        return typeof result === 'string' ? result : JSON.stringify(result);
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