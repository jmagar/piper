import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import { convertMcpToLangchainTools } from '@h1deya/langchain-mcp-tools';
import { initChatModel } from './init-chat-model.js';
import { loadConfig } from './load-config.js';
import path from 'path';

// Helper type for the return value of createLangChainAgent
export interface LangChainAgent {
  agent: ReturnType<typeof createReactAgent>;
  cleanup: () => Promise<void>;
  query: (input: string) => Promise<string>;
}

export async function createLangChainAgent(configPath?: string): Promise<LangChainAgent> {
  // Load config from default path if not provided
  const defaultConfigPath = path.resolve(process.cwd(), '..', 'llm_mcp_config.json5');
  const config = loadConfig(configPath || defaultConfigPath);

  console.log('Initializing model...', config.llm);
  const llmConfig = {
    modelProvider: config.llm.model_provider,
    model: config.llm.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.max_tokens,
  };
  const llm = initChatModel(llmConfig);

  console.log(`Initializing ${Object.keys(config.mcp_servers).length} MCP server(s)...`);
  const { tools, cleanup } = await convertMcpToLangchainTools(
    config.mcp_servers,
    { logLevel: 'info' }
  );

  const agent = createReactAgent({
    llm,
    tools,
    checkpointSaver: new MemorySaver(),
  });

  return {
    agent,
    cleanup,
    async query(input: string) {
      try {
        const agentState = await agent.invoke(
          { messages: [new HumanMessage(input)] },
          { configurable: { thread_id: 'default' } }
        );

        // Get the last message (AI's response)
        const result = agentState.messages[agentState.messages.length - 1].content;
        return typeof result === 'string' ? result : JSON.stringify(result);
      } catch (error) {
        console.error('Failed to process query:', error);
        throw new Error(`Failed to process query: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };
}