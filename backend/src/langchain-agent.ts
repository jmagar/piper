import path from 'path';

import { convertMcpToLangchainTools } from '@h1deya/langchain-mcp-tools';
import { HumanMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import debug from 'debug';

import { initChatModel } from './init-chat-model.js';
import { loadConfig } from './load-config.js';

const log = debug('mcp:agent');
const error = debug('mcp:agent:error');

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

  log('Initializing model with config: %o', config.llm);
  const llmConfig = {
    modelProvider: config.llm.model_provider,
    model: config.llm.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.max_tokens,
  };
  const llm = initChatModel(llmConfig);

  log('Initializing %d MCP server(s)...', Object.keys(config.mcp_servers).length);
  const { tools, cleanup } = await convertMcpToLangchainTools(
    config.mcp_servers,
    { logLevel: 'info' }
  );
  log('Successfully initialized MCP tools: %d tools available', tools.length);

  log('Creating REACT agent...');
  const agent = createReactAgent({
    llm,
    tools,
    checkpointSaver: new MemorySaver(),
  });
  log('REACT agent created successfully');

  return {
    agent,
    cleanup,
    async query(input: string) {
      try {
        log('Processing query: %s', input);
        const agentState = await agent.invoke(
          { messages: [new HumanMessage(input)] },
          { configurable: { thread_id: 'default' } }
        );

        // Get the last message (AI's response)
        const result = agentState.messages[agentState.messages.length - 1].content;
        const response = typeof result === 'string' ? result : JSON.stringify(result);
        log('Query processed successfully, response length: %d', response.length);
        return response;
      } catch (err) {
        error('Failed to process query: %s', err instanceof Error ? err.message : String(err));
        throw new Error(`Failed to process query: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };
}