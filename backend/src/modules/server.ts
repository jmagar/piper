import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { convertMcpToLangchainTools } from '@h1deya/langchain-mcp-tools';
import { initChatModel } from '../init-chat-model.js';
import { loadConfig } from '../load-config.js';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StructuredTool } from '@langchain/core/tools';
import { Config } from '../types/index.js';

async function initializeMcpTools(config: Config) {
    const { tools, cleanup } = await convertMcpToLangchainTools(
        config.mcp_servers,
        { logLevel: 'debug' }
    );
    
    console.log(`Initialized ${tools.length} MCP tools`);
    return { tools, cleanup };
}

async function initializeAgent(model: BaseChatModel, tools: StructuredTool[]) {
    const agent = await createReactAgent({
        llm: model,
        tools,
        checkpointSaver: new MemorySaver(),
    });
    
    return agent;
}

export async function initializeServer() {
    try {
        // Load configuration
        const config = await loadConfig('llm_mcp_config.json5');
        console.log('Configuration loaded');
        
        // Initialize LLM
        const model = await initChatModel({
            modelProvider: config.llm.model_provider,
            model: config.llm.model,
            temperature: config.llm.temperature,
            maxTokens: config.llm.max_tokens
        });
        console.log('LLM initialized');

        // Initialize MCP servers and tools
        const { tools, cleanup } = await initializeMcpTools(config);

        // Initialize ReAct agent
        const agent = await initializeAgent(model, tools);
        console.log('Agent initialized');

        return {
            config,
            tools,
            agent,
            cleanup
        };
    } catch (error) {
        console.error('Failed to initialize server:', error);
        throw error;
    }
} 