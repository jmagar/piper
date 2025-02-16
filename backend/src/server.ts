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
import { format } from 'date-fns';
import { setupTerminalServer } from './terminal-server.js';

// Create a custom logger that broadcasts to WebSocket clients
const logClients = new Set<WebSocket>();

function formatTimestamp(date: Date): string {
    return `[${format(date, 'yyyy/MM/dd')}][${format(date, 'hh:mm:ss aa')} EST]`;
}

function broadcastLog(level: 'info' | 'error' | 'debug', message: string) {
    const logEntry = {
        timestamp: formatTimestamp(new Date()),
        level,
        message
    };
    
    logClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(logEntry));
        }
    });
    
    // Also log to console with the same timestamp format
    const logMessage = `${logEntry.timestamp} ${message}`;
    if (level === 'error') {
        console.error(logMessage);
    } else {
        console.log(logMessage);
    }
}

// Load environment variables
broadcastLog('info', 'Loading environment variables...');
dotenv.config();

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws/logs' });

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

        // Process all messages to track tool usage
        let currentToolUsage: { tool?: string; input?: string; observation?: string } = {};
        let finalResponse = '';

        // Process messages in order to track tool usage
        for (const msg of result.messages) {
            if (!('content' in msg) || typeof msg.content !== 'string') continue;
            
            const content = msg.content.trim();
            
            if (content.includes('Action:') && content.includes('Action Input:')) {
                // This is a tool action message
                const actionMatch = content.match(/Action: (\w+)/);
                const actionInputMatch = content.match(/Action Input: (.*?)(?=\n|$)/s);
                
                if (actionMatch) {
                    currentToolUsage = {
                        tool: actionMatch[1],
                        input: actionInputMatch ? actionInputMatch[1].trim() : '',
                    };
                }
            } else if (content.includes('Observation:')) {
                // This is a tool observation
                const observationMatch = content.match(/Observation: (.*?)(?=\n|$)/s);
                if (observationMatch && currentToolUsage.tool) {
                    currentToolUsage.observation = observationMatch[1].trim();
                    
                    // Format the tool usage
                    finalResponse += 'Action: Using ' + currentToolUsage.tool + '\n' +
                                   'Parameters: ' + currentToolUsage.input + '\n' +
                                   'Result: ' + currentToolUsage.observation + '\n\n';
                    
                    // Reset for next tool usage
                    currentToolUsage = {};
                }
            } else if (msg === result.messages[result.messages.length - 1]) {
                // This is the final response
                finalResponse += content;
            }
        }

        let response = finalResponse || result.messages[result.messages.length - 1]?.content || 'I apologize, but I was unable to generate a proper response.';
        
        broadcastLog('info', 'Successfully extracted response content');
        
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

// Tools info endpoint
const handleToolsInfo = (_req: Request, res: Response): void => {
    broadcastLog('info', 'Tools info requested');
    const toolsInfo = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        requiredParameters: 'required' in tool.schema ? Object.keys(tool.schema.required) : [],
        schema: tool.schema
    }));
    res.json(toolsInfo);
};

// Servers info endpoint
const handleServersInfo = async (_req: Request, res: Response): Promise<void> => {
    try {
        broadcastLog('info', 'Servers info requested');
        const serversInfo = await Promise.all(
            Object.entries(config.mcp_servers).map(async ([name, server]) => {
                try {
                    // Find all tools associated with this server
                    const serverTools = tools.filter(tool => 
                        tool.name.toLowerCase().includes(name.toLowerCase()) ||
                        tool.description.toLowerCase().includes(name.toLowerCase())
                    );

                    let status: 'running' | 'stopped' | 'error' = 'stopped';
                    let error: string | undefined;

                    if (serverTools.length > 0) {
                        // If we have any tools from this server, consider it running
                        status = 'running';
                        // Log available operations for this server
                        const operations = serverTools.map(tool => tool.name).join(', ');
                        broadcastLog('debug', `Server ${name} operations available: ${operations}`);
                    } else {
                        status = 'stopped';
                        error = 'No tools found for this server';
                        broadcastLog('debug', `No tools found for server ${name}`);
                    }

                    // Include server configuration in response
                    const serverInfo = {
                        name,
                        command: server.command,
                        args: server.args,
                        status,
                        error,
                        lastChecked: new Date().toISOString(),
                        // Include additional useful information
                        toolCount: serverTools.length,
                        env: server.env ? Object.keys(server.env) : [],
                    };

                    broadcastLog('info', `${name}: ${status}${error ? ` (${error})` : ''}`);
                    return serverInfo;

                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : 'Unknown error checking server status';
                    broadcastLog('error', `Failed to check ${name} server: ${errorMsg}`);
                    return {
                        name,
                        command: server.command,
                        args: server.args,
                        status: 'error' as const,
                        error: errorMsg,
                        lastChecked: new Date().toISOString(),
                        toolCount: 0,
                        env: server.env ? Object.keys(server.env) : [],
                    };
                }
            })
        );
        
        broadcastLog('info', `Server status check completed. Found ${serversInfo.length} servers.`);
        
        // Add summary statistics
        const summary = {
            total: serversInfo.length,
            running: serversInfo.filter(s => s.status === 'running').length,
            stopped: serversInfo.filter(s => s.status === 'stopped').length,
            error: serversInfo.filter(s => s.status === 'error').length,
        };
        
        broadcastLog('info', `Summary: ${summary.running} running, ${summary.stopped} stopped, ${summary.error} error`);
        
        res.json({
            servers: serversInfo,
            summary,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        broadcastLog('error', `Error checking server status: ${errorMsg}`);
        res.status(500).json({ 
            error: 'Failed to check server status',
            details: errorMsg,
            timestamp: new Date().toISOString()
        });
    }
};

// MCP Config endpoint
const handleMcpConfig = (_req: Request, res: Response): void => {
    broadcastLog('info', 'MCP config requested');
    res.json({
        llm: {
            model_provider: config.llm.model_provider,
            model: config.llm.model,
            temperature: config.llm.temperature,
            max_tokens: config.llm.max_tokens
        }
    });
};

// Initialize terminal server
broadcastLog('info', '=== Initializing Terminal Server ===');
setupTerminalServer(httpServer, process.cwd());
broadcastLog('info', 'Terminal server initialized successfully');

app.post('/api/chat', handleChat);
app.get('/health', handleHealth);
app.get('/api/tools', handleToolsInfo);
app.get('/api/servers', handleServersInfo);
app.get('/api/config', handleMcpConfig);

httpServer.listen(port, () => {
    broadcastLog('info', '\n=== Server Started ===');
    broadcastLog('info', `MCP server listening at http://localhost:${port}`);
    broadcastLog('info', 'Ready to handle requests');
}); 