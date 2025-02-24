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

function formatResponse(response: string): string {
  try {
    const data = JSON.parse(response);
    
    // Handle Docker container list response
    if (Array.isArray(data) && data.length > 0 && data[0].type === 'text' && 
        (data[0].text.includes('Docker containers') || data[0].text.includes('docker ps'))) {
      // Extract just the container information
      const text = data[0].text;
      const lines = text.split('\n');
      
      // Find the start of container list (after the explanation)
      const containerStartIndex = lines.findIndex((line: string) => line.includes('CONTAINER ID') || line.includes('Container ID'));
      if (containerStartIndex !== -1) {
        // Get only the container list lines
        const containerLines = lines.slice(containerStartIndex);
        // Filter out any lines that are part of the explanation or questions
        return containerLines.filter((line: string) => 
          !line.includes("I've retrieved") && 
          !line.includes("Would you like") &&
          !line.includes("Is there anything") &&
          !line.includes("Here are") &&
          line.trim() !== ''
        ).join('\n');
      }

      // If we can't find the table header, try to extract the container list
      const containerSection = lines.findIndex((line: string) => line.includes('containers that are currently running'));
      if (containerSection !== -1) {
        const containerLines = lines.slice(containerSection);
        return containerLines.filter((line: string) =>
          !line.includes("Here are") &&
          !line.includes("Would you like") &&
          !line.includes("The following containers") &&
          line.trim() !== ''
        ).join('\n');
      }
      
      return text;
    }
    
    // Handle file listing response
    if (Array.isArray(data) && data.length > 0 && data[0].type === 'text' && data[0].text.includes('files')) {
      const text = data[0].text;
      const lines = text.split('\n').filter((line: string) => 
        !line.startsWith('\n\n') && 
        !line.startsWith("Here are") &&
        !line.startsWith("Would you like") &&
        line.trim() !== ''
      );
      return lines.join('\n');
    }
    
    // For other responses, return just the text content
    if (Array.isArray(data) && data.length > 0 && data[0].type === 'text') {
      return data[0].text;
    }
    
    return typeof data === 'string' ? data : data[0]?.text || response;
  } catch {
    return response;
  }
}

export async function createLangChainAgent(configPath?: string): Promise<LangChainAgent> {
  try {
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
          const response = formatResponse(typeof result === 'string' ? result : JSON.stringify(result));
          log('Query processed successfully, response length: %d', response.length);
          return response;
        } catch (err) {
          error('Failed to process query: %s', err instanceof Error ? err.message : String(err));
          throw new Error(`Failed to process query: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    };
  } catch (err) {
    error('Failed to create LangChain agent: %s', err instanceof Error ? err.message : String(err));
    throw new Error(`Failed to create LangChain agent: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}