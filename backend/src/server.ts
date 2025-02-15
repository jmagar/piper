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
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
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
const { tools, cleanup } = await convertMcpToLangchainTools({});
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
        if (!message || typeof message !== 'string') {
            res.status(400).json({ error: 'Message is required and must be a string' });
            return;
        }

        // Create the message array with proper typing
        const messages: BaseMessage[] = [new HumanMessage(message)];
        const result = await agent.invoke({ messages });

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
                    const meaningfulContent = Object.entries(result)
                        .filter(([key, value]) => 
                            typeof value === 'string' && 
                            !key.includes('id') && 
                            !key.includes('metadata'))
                        .map(([, value]) => value)
                        .join('\n');
                    response = meaningfulContent || JSON.stringify(result, null, 2);
                }
            } else {
                response = String(result);
            }
        } catch (error) {
            console.error('Response formatting error:', error);
            response = String(result);
        }
            
        res.json({ response });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Internal server error' });
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