import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
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

const agent = await createReactAgent({
    llm: model,
    tools,
    checkpointSaver: new MemorySaver(),
});

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
        const result = await agent.invoke(
            { messages },
            { configurable: { thread_id: 'chat-thread' } }
        );
        console.log('Agent result:', result);

        // Get the last message from the agent's response
        const lastMessage = result.messages[result.messages.length - 1];
        console.log('Last message:', lastMessage);

        let response = '';
        if (lastMessage) {
            if ('content' in lastMessage && typeof lastMessage.content === 'string') {
                response = lastMessage.content;
            }
        }

        if (!response) {
            response = 'I apologize, but I was unable to generate a proper response.';
        }

        console.log('Final response:', response);
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