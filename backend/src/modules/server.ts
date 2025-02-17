import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { convertMcpToLangchainTools } from '@h1deya/langchain-mcp-tools';
import { initChatModel } from '../init-chat-model.js';
import { loadConfig } from '../load-config.js';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StructuredTool } from '@langchain/core/tools';
import { Config, MCPServerConfig } from '../types/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { broadcastLog } from '../utils/logger.js';

// ES Module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function validateServerConfig(name: string, config: MCPServerConfig) {
    const requiredEnvVars = new Map([
        ['mcp-server-firecrawl', ['FIRE_CRAWL_API_KEY']],
        ['brave-search', ['BRAVE_API_KEY']],
        ['github', ['GITHUB_PERSONAL_ACCESS_TOKEN']],
        // Add other servers and their required env vars
    ]);

    const required = requiredEnvVars.get(name);
    if (required) {
        for (const envVar of required) {
            if (!config.env?.[envVar]) {
                throw new Error(`${envVar} environment variable is required for ${name}`);
            }
        }
    }
}

async function initializeMcpTools(config: Config) {
    try {
        // Validate each server's configuration before initialization
        Object.entries(config.mcp_servers).forEach(([name, serverConfig]) => {
            try {
                validateServerConfig(name, serverConfig);
                broadcastLog('info', `MCP server "${name}": configuration validated`);
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                broadcastLog('error', `MCP server "${name}": configuration validation failed - ${errorMessage}`);
                // Remove invalid server from config to prevent initialization
                delete config.mcp_servers[name];
            }
        });

        // Initialize MCP tools with default configuration
        const { tools, cleanup } = await convertMcpToLangchainTools(config.mcp_servers);
        
        broadcastLog('info', `Initialized ${tools.length} MCP tools`);
        return { tools, cleanup };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        broadcastLog('error', `Failed to initialize MCP tools: ${errorMessage}`);
        throw error;
    }
}

async function initializeAgent(model: BaseChatModel, tools: StructuredTool[]) {
    try {
        const agent = await createReactAgent({
            llm: model,
            tools,
            checkpointSaver: new MemorySaver(),
        });
        
        return agent;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        broadcastLog('error', `Failed to initialize agent: ${errorMessage}`);
        throw error;
    }
}

export async function initializeServer() {
    try {
        // Load configuration
        const rawConfig = await loadConfig(path.resolve(__dirname, '../../../llm_mcp_config.json5'));
        
        // Ensure required fields are present
        if (!rawConfig.llm?.model) {
            throw new Error('LLM model configuration is missing or invalid');
        }
        
        const config: Config = {
            ...rawConfig,
            llm: {
                ...rawConfig.llm,
                model: rawConfig.llm.model // Now we know this exists
            }
        };
        
        broadcastLog('info', 'Configuration loaded');
        
        // Initialize LLM
        const model = await initChatModel({
            modelProvider: config.llm.model_provider,
            model: config.llm.model,
            temperature: config.llm.temperature,
            maxTokens: config.llm.max_tokens
        });
        broadcastLog('info', 'LLM initialized');

        // Initialize MCP servers and tools
        const { tools, cleanup } = await initializeMcpTools(config);

        // Initialize ReAct agent
        const agent = await initializeAgent(model, tools);
        broadcastLog('info', 'Agent initialized');

        return {
            config,
            tools,
            agent,
            cleanup
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        broadcastLog('error', `Server initialization failed: ${errorMessage}`);
        throw error;
    }
} 