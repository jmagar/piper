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
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

// Create a custom logger that broadcasts to WebSocket clients
const logClients = new Set<WebSocket>();

function broadcastLog(level: 'info' | 'error' | 'debug', message: string) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message
    };
    
    logClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(logEntry));
        }
    });
    
    // Also log to console
    if (level === 'error') {
        console.error(message);
    } else {
        console.log(message);
    }
}

// Load environment variables
broadcastLog('info', 'Loading environment variables...');
dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/logs' });

wss.on('connection', (ws: WebSocket) => {
    broadcastLog('info', 'New client connected to logs WebSocket');
    logClients.add(ws);

    ws.on('close', () => {
        broadcastLog('info', 'Client disconnected from logs WebSocket');
        logClients.delete(ws);
    });
});

const port = process.env.PORT || 4100;
broadcastLog('info', `Server will listen on port ${port}`);

// CORS configuration
broadcastLog('info', 'Configuring CORS settings...');
const corsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:4100'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
};
broadcastLog('info', 'CORS origins: ' + corsOptions.origin.join(', '));

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Initialize the agent
broadcastLog('info', '=== Initializing MCP Configuration ===');
broadcastLog('info', 'Loading configuration from llm_mcp_config.json5...');
const config = await loadConfig('llm_mcp_config.json5');
broadcastLog('info', 'Configuration loaded successfully');
broadcastLog('info', 'LLM Provider: ' + config.llm.model_provider);
broadcastLog('info', 'Model: ' + config.llm.model);
broadcastLog('info', 'Number of MCP servers to initialize: ' + Object.keys(config.mcp_servers).length);
broadcastLog('info', 'MCP servers to initialize: ' + Object.keys(config.mcp_servers).join(', '));

broadcastLog('info', '=== Initializing LLM ===');
const model = await initChatModel({
    modelProvider: config.llm.model_provider,
    model: config.llm.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.max_tokens
});
broadcastLog('info', 'LLM initialized successfully');

// Convert MCP servers to Langchain tools
broadcastLog('info', '=== Initializing MCP Servers ===');
broadcastLog('info', 'Starting MCP server initialization...');
const { tools, cleanup } = await convertMcpToLangchainTools(
    config.mcp_servers,
    { logLevel: 'debug' }
);

broadcastLog('info', '=== MCP Tools Summary ===');
broadcastLog('info', 'Number of tools available: ' + tools.length);
broadcastLog('info', 'Available tools: ' + tools.map(tool => tool.name).join(', '));
tools.forEach(tool => {
    broadcastLog('info', '\nTool: ' + tool.name);
    broadcastLog('info', 'Description: ' + tool.description);
    // Access schema properties safely
    const schema = tool.schema;
    const requiredFields = 'required' in schema ? Object.keys(schema.required) : [];
    broadcastLog('info', 'Required parameters: ' + requiredFields.join(', '));
});

broadcastLog('info', '=== Initializing ReAct Agent ===');
const agent = await createReactAgent({
    llm: model,
    tools,
    checkpointSaver: new MemorySaver(),
});
broadcastLog('info', 'ReAct Agent initialized successfully');

// Cleanup handler
broadcastLog('info', '=== Setting up Cleanup Handlers ===');
process.on('SIGINT', async () => {
    broadcastLog('info', '\nReceived SIGINT signal');
    broadcastLog('info', 'Cleaning up MCP servers...');
    await cleanup();
    broadcastLog('info', 'Cleanup completed');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    broadcastLog('info', '\nReceived SIGTERM signal');
    broadcastLog('info', 'Cleaning up MCP servers...');
    await cleanup();
    broadcastLog('info', 'Cleanup completed');
    process.exit(0);
});

interface ChatRequest extends Request {
    body: { message: string };
}

// Chat endpoint
const handleChat = async (req: ChatRequest, res: Response): Promise<void> => {
    try {
        broadcastLog('info', '=== New Chat Request ===');
        const { message } = req.body;
        broadcastLog('info', 'Received message: ' + message);
        
        if (!message || typeof message !== 'string') {
            broadcastLog('error', 'Invalid message format: ' + message);
            res.status(400).json({ error: 'Message is required and must be a string' });
            return;
        }

        broadcastLog('info', 'Creating message array...');
        const messages: BaseMessage[] = [new HumanMessage(message)];
        
        broadcastLog('info', 'Invoking agent with message...');
        broadcastLog('info', 'Thread ID: chat-thread');
        const result = await agent.invoke(
            { messages },
            { configurable: { thread_id: 'chat-thread' } }
        );
        broadcastLog('info', 'Agent invocation completed');
        
        broadcastLog('info', '=== Processing Agent Response ===');
        broadcastLog('info', 'Number of messages in result: ' + result.messages.length);
        
        // Get the last message from the agent's response
        const lastMessage = result.messages[result.messages.length - 1];
        broadcastLog('info', 'Last message type: ' + (lastMessage?.constructor.name || 'undefined'));

        let response = '';
        if (lastMessage) {
            if ('content' in lastMessage && typeof lastMessage.content === 'string') {
                response = lastMessage.content;
                broadcastLog('info', 'Successfully extracted response content');
            } else {
                broadcastLog('info', 'No content found in last message');
            }
        } else {
            broadcastLog('info', 'No messages found in agent response');
        }

        if (!response) {
            broadcastLog('info', 'No valid response found, using fallback message');
            response = 'I apologize, but I was unable to generate a proper response.';
        }

        broadcastLog('info', '=== Sending Response ===');
        broadcastLog('info', 'Response length: ' + response.length);
        broadcastLog('info', 'Final response: ' + response);
        res.setHeader('Content-Type', 'text/plain');
        res.send(response);
        broadcastLog('info', 'Response sent successfully');
    } catch (error) {
        broadcastLog('info', '=== Error in Chat Handler ===');
        broadcastLog('error', 'Error details: ' + error);
        res.status(500).send('Internal server error');
    }
};

// Health check endpoint
const handleHealth = (_req: Request, res: Response): void => {
    broadcastLog('info', 'Health check requested');
    res.json({ status: 'ok' });
};

app.post('/api/chat', handleChat);
app.get('/health', handleHealth);

server.listen(port, () => {
    broadcastLog('info', '\n=== Server Started ===');
    broadcastLog('info', `MCP server listening at http://localhost:${port}`);
    broadcastLog('info', 'Ready to handle requests');
}); 