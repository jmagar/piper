import path from 'path';
import { convertMcpToLangchainTools } from '@h1deya/langchain-mcp-tools';
import { HumanMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import type { StructuredTool } from '@langchain/core/tools';
import type { ZodObject } from 'zod';
import debug from 'debug';

import { loadConfig } from './load-config.js';
import { ModelFactory } from './services/chat/model-factory.mjs';
import type { ChatModelInstance, SupportedModelProvider } from './types/chat-model.js';

const log = debug('mcp:agent');
const error = debug('mcp:agent:error');

export interface LangChainAgent {
  agent: ReturnType<typeof createReactAgent>;
  cleanup: () => Promise<void>;
  query: (input: string) => Promise<string>;
}

interface AgentOptions {
  configPath?: string;
  streaming?: boolean;
  memory?: boolean;
  memoryWindowSize?: number;
  fallbackProvider?: SupportedModelProvider;
}

interface ReactAgentConfig {
  llm: ChatModelInstance;
  tools: StructuredTool[];
  checkpointSaver?: MemorySaver;
  maxIterations?: number;
  returnIntermediateSteps?: boolean;
}

interface LLMConfig {
  model_provider: string;
  model: string;
  temperature?: number;
  max_tokens?: number;
}

interface ValidConfig {
  llm: LLMConfig;
  mcp_servers: Record<string, unknown>;
}

export class AgentError extends Error {
  constructor(
    message: string,
    public override readonly cause?: Error
  ) {
    super(message);
    this.name = 'AgentError';
    Error.captureStackTrace(this, AgentError);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isLLMConfig(value: unknown): value is LLMConfig {
  return (
    isRecord(value) &&
    typeof value.model_provider === 'string' &&
    typeof value.model === 'string' &&
    (value.temperature === undefined || typeof value.temperature === 'number') &&
    (value.max_tokens === undefined || typeof value.max_tokens === 'number')
  );
}

function isValidConfig(value: unknown): value is ValidConfig {
  return (
    isRecord(value) &&
    isRecord(value.mcp_servers) &&
    isLLMConfig(value.llm)
  );
}

function formatToolResponse(response: string): string {
  try {
    // Try to parse as JSON
    const data = JSON.parse(response);
    
    // Handle file listing response
    if (Array.isArray(data) && data.length > 0 && data[0].type === 'text') {
      return data[0].text;
    }
    
    // For other responses, return as plain text
    return typeof data === 'string' ? data : data[0]?.text || response;
  } catch {
    // If not JSON or parsing fails, return as is
    return response;
  }
}

export async function createLangChainAgent(options: AgentOptions = {}): Promise<LangChainAgent> {
  try {
    // Load config from default path if not provided
    const defaultConfigPath = path.resolve(process.cwd(), '..', 'llm_mcp_config.json5');
    const rawConfig = loadConfig(options.configPath || defaultConfigPath);
    
    if (!isValidConfig(rawConfig)) {
      throw new AgentError('Invalid configuration format');
    }

    log('Initializing model with config: %o', rawConfig.llm);
    const llmConfig = {
      modelProvider: rawConfig.llm.model_provider as SupportedModelProvider,
      model: rawConfig.llm.model,
      temperature: rawConfig.llm.temperature,
      maxTokens: rawConfig.llm.max_tokens,
    };

    // Initialize the model with memory and streaming support
    const model = await ModelFactory.create(llmConfig, {
      streaming: options.streaming,
      memory: options.memory,
      memoryOptions: {
        windowSize: options.memoryWindowSize,
        returnMessages: true,
      },
      fallbackProvider: options.fallbackProvider,
    });

    log('Initializing %d MCP server(s)...', Object.keys(rawConfig.mcp_servers).length);
    const { tools, cleanup } = await convertMcpToLangchainTools(
      rawConfig.mcp_servers,
      { logLevel: 'info' }
    );
    log('Successfully initialized MCP tools: %d tools available', tools.length);

    // Configure the REACT agent with improved settings
    const agentConfig: ReactAgentConfig = {
      llm: model,
      tools: tools as StructuredTool<ZodObject<any, any>>[], // Type assertion needed due to tool schema complexity
      checkpointSaver: new MemorySaver(),
      maxIterations: 10,
      returnIntermediateSteps: true,
    };

    log('Creating REACT agent...');
    const agent = createReactAgent(agentConfig);
    log('REACT agent created successfully');

    return {
      agent,
      cleanup,
      async query(input: string) {
        try {
          log('Processing query: %s', input);
          const agentState = await agent.invoke(
            { messages: [new HumanMessage(input)] },
            { 
              configurable: { 
                thread_id: 'default',
                metadata: {
                  timestamp: new Date().toISOString(),
                  input_length: input.length,
                }
              }
            }
          );

          // Get the last message (AI's response)
          const result = agentState.messages[agentState.messages.length - 1].content;
          const response = formatToolResponse(typeof result === 'string' ? result : JSON.stringify(result));
          
          log('Query processed successfully, response length: %d', response.length);
          return response;
        } catch (err) {
          error('Failed to process query: %s', err instanceof Error ? err.message : String(err));
          throw new AgentError(
            `Failed to process query: ${err instanceof Error ? err.message : 'Unknown error'}`,
            err instanceof Error ? err : undefined
          );
        }
      }
    };
  } catch (err) {
    error('Failed to create LangChain agent: %s', err instanceof Error ? err.message : String(err));
    throw new AgentError(
      `Failed to create LangChain agent: ${err instanceof Error ? err.message : 'Unknown error'}`,
      err instanceof Error ? err : undefined
    );
  }
}