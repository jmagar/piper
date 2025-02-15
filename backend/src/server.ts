import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage } from '@langchain/core/messages';
import { convertMcpToLangchainTools } from '@h1deya/langchain-mcp-tools';
import { initChatModel } from './init-chat-model.js';
import { loadConfig } from './load-config.js';
import dotenv from 'dotenv';
import { BaseMessage } from '@langchain/core/messages';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 4100; // Different from Next.js port

// CORS configuration
const corsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:4100'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Initialize the agent
const config = await loadConfig('llm_mcp_config.json5');
const model = await initChatModel({
    modelProvider: config.llm.model_provider,
    model: config.llm.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.max_tokens
});

// Convert MCP servers to Langchain tools
const { tools, cleanup } = await convertMcpToLangchainTools(
    config.mcp_servers,
    { logLevel: 'debug' }
);

console.log('Available tools:', tools.map(tool => tool.name));

const agent = await createReactAgent({ llm: model, tools });

// Cleanup handler
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

interface ChatRequest extends Request {
    body: { message: string };
}

// Chat endpoint
const handleChat = async (req: ChatRequest, res: Response): Promise<void> => {
    try {
        const { message } = req.body;
        console.log('Received message:', message);
        
        if (!message || typeof message !== 'string') {
            console.log('Invalid message format:', message);
            res.status(400).json({ error: 'Message is required and must be a string' });
            return;
        }

        // Create the message array with proper typing
        const messages: BaseMessage[] = [new HumanMessage(message)];
        console.log('Invoking agent with message:', message);
        const result = await agent.invoke({ messages });
        console.log('Agent result:', result);

        // Handle the result differently since the type has changed
        let response;
        try {
            if (typeof result === 'object' && result !== null) {
                if ('content' in result) {
                    response = String(result.content);
                } else if ('response' in result) {
                    response = String(result.response);
                } else if ('output' in result) {
                    response = String(result.output);
                } else {
                    // Extract meaningful content from the object
                    response = Object.entries(result)
                        .filter(([key, value]) => 
                            typeof value === 'string' && 
                            !key.includes('id') && 
                            !key.includes('metadata'))
                        .map(([, value]) => value)
                        .join('\n');
                }
            } else {
                response = String(result);
            }
            
            // Clean up any remaining JSON-like formatting
            try {
                const parsed = JSON.parse(response);
                if (typeof parsed === 'object' && parsed !== null) {
                    response = parsed.content || parsed.response || parsed.output || String(parsed);
                }
            } catch {
                // If it's not valid JSON, keep the original response
            }
        } catch (error) {
            console.error('Response formatting error:', error);
            response = String(result);
        }
            
        res.setHeader('Content-Type', 'text/plain');
        res.send(response);
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).send('Internal server error');
    }
};

// Health check endpoint
const handleHealth = (_req: Request, res: Response): void => {
    res.json({ status: 'ok' });
};

app.post('/api/chat', handleChat);
app.get('/health', handleHealth);

app.listen(port, () => {
    console.log(`MCP server listening at http://localhost:${port}`);
}); 