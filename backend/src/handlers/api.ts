import { Request, Response } from 'express';
import { HumanMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { Agent, ChatRequest, ServerState, ToolUsage } from '../types/index.js';
import { broadcastLog } from '../utils/logger.js';
import { Config, MCPServerConfig } from '../load-config.js';
import { BaseMessage } from '@langchain/core/messages';

export function handleHealth(
    _req: Request,
    res: Response,
    serverState: ServerState,
    initializationError: string | null
): void {
    broadcastLog('info', 'Health check requested');
    res.json({ 
        status: serverState,
        error: initializationError,
        timestamp: new Date().toISOString()
    });
}

export async function handleChat(
    req: ChatRequest,
    res: Response,
    {
        agent,
        serverState,
        initializationError
    }: {
        agent: Agent | undefined;
        serverState: ServerState;
        initializationError: string | null;
    }
): Promise<void> {
    try {
        broadcastLog('info', '=== New Chat Request ===');
        broadcastLog('info', 'Request headers: ' + JSON.stringify(req.headers));
        broadcastLog('info', 'Request body: ' + JSON.stringify(req.body));
        
        const { message } = req.body;
        broadcastLog('info', 'Received message: ' + message);
        
        if (!message || typeof message !== 'string') {
            broadcastLog('error', 'Invalid message format: ' + JSON.stringify(message));
            res.status(400).json({ 
                error: 'Message is required and must be a string',
                received: message 
            });
            return;
        }

        if (!agent) {
            broadcastLog('error', 'Agent not initialized');
            res.status(503).json({ 
                error: 'Chat service not available - agent not initialized',
                serverState,
                initializationError 
            });
            return;
        }

        broadcastLog('info', 'Creating message array...');
        const messages = [new HumanMessage(message)];
        
        broadcastLog('info', 'Invoking agent with message...');
        broadcastLog('info', 'Thread ID: chat-thread');
        const result = await agent.invoke(
            { messages },
            { configurable: { thread_id: 'chat-thread' } }
        );
        broadcastLog('info', 'Agent invocation completed');
        
        broadcastLog('info', '=== Processing Agent Response ===');
        broadcastLog('info', 'Number of messages in result: ' + result.messages.length);

        const response = processAgentResponse(result.messages);
        
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
}

function processAgentResponse(messages: BaseMessage[]): string {
    let currentToolUsage: ToolUsage = {};
    let finalResponse = '';

    for (const msg of messages) {
        if (!('content' in msg) || typeof msg.content !== 'string') continue;
        
        const content = msg.content.trim();
        
        if (content.includes('Action:') && content.includes('Action Input:')) {
            const actionMatch = content.match(/Action: (\w+)/);
            const actionInputMatch = content.match(/Action Input: (.*?)(?=\n|$)/s);
            
            if (actionMatch) {
                currentToolUsage = {
                    tool: actionMatch[1],
                    input: actionInputMatch ? actionInputMatch[1].trim() : '',
                };
            }
        } else if (content.includes('Observation:')) {
            const observationMatch = content.match(/Observation: (.*?)(?=\n|$)/s);
            if (observationMatch && currentToolUsage.tool) {
                currentToolUsage.observation = observationMatch[1].trim();
                
                finalResponse += 'Action: Using ' + currentToolUsage.tool + '\n' +
                               'Parameters: ' + currentToolUsage.input + '\n' +
                               'Result: ' + currentToolUsage.observation + '\n\n';
                
                currentToolUsage = {};
            }
        } else if (msg === messages[messages.length - 1]) {
            finalResponse += content;
        }
    }

    const lastMessage = messages[messages.length - 1];
    return finalResponse || (lastMessage && typeof lastMessage.content === 'string' ? lastMessage.content : 'I apologize, but I was unable to generate a proper response.');
}

export function handleToolsInfo(
    _req: Request,
    res: Response,
    tools: StructuredTool[]
): void {
    broadcastLog('info', 'Tools info requested');
    const toolsInfo = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        requiredParameters: 'required' in tool.schema ? Object.keys(tool.schema.required) : [],
        schema: tool.schema
    }));
    res.json(toolsInfo);
}

export async function handleServersInfo(
    _req: Request,
    res: Response,
    {
        config,
        tools
    }: {
        config: Config;
        tools: StructuredTool[];
    }
): Promise<void> {
    try {
        broadcastLog('info', 'Servers info requested');
        const serversInfo = await Promise.all(
            Object.entries(config.mcp_servers).map(async ([name, server]: [string, MCPServerConfig]) => {
                try {
                    const serverTools = tools.filter(tool => 
                        tool.name.toLowerCase().includes(name.toLowerCase()) ||
                        tool.description.toLowerCase().includes(name.toLowerCase())
                    );

                    let status: 'running' | 'stopped' | 'error' = 'stopped';
                    let error: string | undefined;

                    if (serverTools.length > 0) {
                        status = 'running';
                        const operations = serverTools.map(tool => tool.name).join(', ');
                        broadcastLog('debug', `Server ${name} operations available: ${operations}`);
                    } else {
                        status = 'stopped';
                        error = 'No tools found for this server';
                        broadcastLog('debug', `No tools found for server ${name}`);
                    }

                    const serverInfo = {
                        name,
                        command: server.command,
                        args: server.args,
                        status,
                        error,
                        lastChecked: new Date().toISOString(),
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
}

export function handleMcpConfig(
    _req: Request,
    res: Response,
    config: Config
): void {
    broadcastLog('info', 'MCP config requested');
    res.json({
        llm: {
            model_provider: config.llm.model_provider,
            model: config.llm.model,
            temperature: config.llm.temperature,
            max_tokens: config.llm.max_tokens
        }
    });
} 