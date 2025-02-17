import type { Request, Response } from 'express';
import { broadcastLog } from '../utils/logger.js';
import { Config, MCPServerConfig } from '../types/index.js';
import { ServerStatus, ServerInfo, ServerSummary, Tool, ToolParameter } from '../types/server.js';
import { publishServerStatus } from '../websocket.js';

const DEFAULT_HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds
const DEFAULT_CHECK_INTERVAL = 10000; // 10 seconds

interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: number;
    method: string;
    params?: Record<string, unknown>;
}

interface JsonRpcResponse<T> {
    jsonrpc: '2.0';
    id: number;
    result?: T;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}

interface MCPToolParameter {
    type: string;
    description: string;
}

interface MCPTool {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, MCPToolParameter>;
        required: string[];
    };
}

interface ToolsListResponse {
    tools: MCPTool[];
}

interface ServerStatusResponse {
    protocol_version: string;
    version: string;
    status: 'ready' | 'starting' | 'stopping' | 'error';
    features: string[];
    error?: string;
    capabilities?: {
        tools?: boolean;
        prompts?: boolean;
        resources?: boolean;
        sampling?: boolean;
    };
}

function convertMCPToolToTool(mcpTool: MCPTool): Tool {
    const properties: Record<string, ToolParameter> = {};
    
    // Convert properties and add required field
    Object.entries(mcpTool.parameters.properties).forEach(([key, value]) => {
        properties[key] = {
            ...value,
            required: mcpTool.parameters.required.includes(key)
        };
    });

    return {
        name: mcpTool.name,
        description: mcpTool.description,
        parameters: {
            type: 'object',
            properties,
            required: mcpTool.parameters.required
        }
    };
}

async function checkServerHealth(name: string, server: MCPServerConfig): Promise<ServerInfo> {
    try {
        // Check server health and discover tools using MCP protocol
        let status: ServerStatus;
        try {
            // Get server URL from config
            const baseUrl = server.base_url;
            if (!baseUrl) {
                throw new Error('Server base_url not configured');
            }

            // First check server status using JSON-RPC
            const statusRequest: JsonRpcRequest = {
                jsonrpc: '2.0',
                id: 1,
                method: 'server/status',
                params: {}
            };
            
            broadcastLog('debug', `Checking status for ${name} at ${baseUrl}`);
            const statusResponse = await fetch(baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(statusRequest),
                signal: AbortSignal.timeout(DEFAULT_HEALTH_CHECK_TIMEOUT)
            });

            if (!statusResponse.ok) {
                throw new Error(`Server returned status ${statusResponse.status}`);
            }

            const statusData = await statusResponse.json() as JsonRpcResponse<ServerStatusResponse>;
            if (statusData.error) {
                throw new Error(`JSON-RPC error: ${statusData.error.message}`);
            }
            if (!statusData.result) {
                throw new Error('Invalid JSON-RPC response: missing result');
            }

            const serverStatus = statusData.result;
            
            // If server is ready and has tools capability, discover tools
            let tools: Tool[] = [];
            if (serverStatus.status === 'ready' && serverStatus.capabilities?.tools) {
                // Try to list tools using JSON-RPC
                const toolsRequest: JsonRpcRequest = {
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'tools/list',
                    params: {}
                };

                broadcastLog('debug', `Discovering tools for ${name}`);
                const toolsResponse = await fetch(baseUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(toolsRequest),
                    signal: AbortSignal.timeout(DEFAULT_HEALTH_CHECK_TIMEOUT)
                });

                if (toolsResponse.ok) {
                    const toolsData = await toolsResponse.json() as JsonRpcResponse<ToolsListResponse>;
                    
                    if (toolsData.error) {
                        broadcastLog('warn', `Tool discovery error for ${name}: ${toolsData.error.message}`);
                    } else if (toolsData.result) {
                        tools = toolsData.result.tools.map(convertMCPToolToTool);
                    }
                } else {
                    broadcastLog('warn', `Tool discovery failed for ${name}: ${toolsResponse.status}`);
                }
            }

            status = {
                status: serverStatus.status,
                protocol_version: serverStatus.protocol_version,
                version: serverStatus.version,
                features: serverStatus.features,
                error: serverStatus.error,
                tools,
                capabilities: serverStatus.capabilities
            };

        } catch (error) {
            broadcastLog('error', `Health check failed for ${name}: ${error instanceof Error ? error.message : String(error)}`);
            
            status = {
                status: 'error',
                error: error instanceof Error ? error.message : String(error),
                version: 'unknown',
                protocol_version: '2024-11-05',
                features: [],
                tools: [],
                capabilities: {}
            };
        }

        const serverInfo: ServerInfo = {
            name,
            command: server.command,
            args: server.args,
            status: status.status,
            error: status.error,
            lastChecked: new Date().toISOString(),
            toolCount: status.tools.length,
            env: server.env ? Object.keys(server.env) : [],
            tools: status.tools,
            features: status.features,
            version: status.version,
            protocol_version: status.protocol_version,
            capabilities: status.capabilities
        };

        // Publish status update via WebSocket
        await publishServerStatus(null, name, status);

        broadcastLog('info', `${name}: ${status.status}${status.error ? ` (${status.error})` : ''}`);
        return serverInfo;

    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error checking server status';
        broadcastLog('error', `Failed to check ${name} server: ${errorMsg}`);

        const serverInfo: ServerInfo = {
            name,
            command: server.command,
            args: server.args,
            status: 'error',
            error: errorMsg,
            lastChecked: new Date().toISOString(),
            toolCount: 0,
            env: server.env ? Object.keys(server.env) : [],
            tools: [],
            features: [],
            version: 'unknown',
            protocol_version: '2024-11-05',
            capabilities: {}
        };

        // Publish error status via WebSocket
        await publishServerStatus(null, name, {
            status: 'error',
            error: errorMsg,
            version: 'unknown',
            protocol_version: '2024-11-05',
            features: [],
            tools: [],
            capabilities: {}
        });

        return serverInfo;
    }
}

export function createServersHandler(config: Config) {
    // Start periodic health checks
    setInterval(async () => {
        try {
            // Create health check promises
            const healthChecks = Object.entries(config.mcp_servers).map(([name, server]) => {
                const interval = server.health_check?.interval || DEFAULT_CHECK_INTERVAL;
                if (interval !== DEFAULT_CHECK_INTERVAL) {
                    // If server has custom interval, schedule its own check
                    setInterval(() => checkServerHealth(name, server), interval);
                    return null;
                }
                return checkServerHealth(name, server);
            });

            // Filter out null values and await all health checks
            const serversInfo = (await Promise.all(healthChecks)).filter((info): info is ServerInfo => info !== null);

            const summary: ServerSummary = {
                total: serversInfo.length,
                ready: serversInfo.filter(s => s.status === 'ready').length,
                starting: serversInfo.filter(s => s.status === 'starting').length,
                stopping: serversInfo.filter(s => s.status === 'stopping').length,
                error: serversInfo.filter(s => s.status === 'error').length,
            };

            broadcastLog('debug', `Health check completed: ${JSON.stringify(summary)}`);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            broadcastLog('error', `Health check failed: ${errorMsg}`);
        }
    }, DEFAULT_CHECK_INTERVAL);

    return async function handleServersInfo(_req: Request, res: Response): Promise<void> {
        try {
            broadcastLog('info', 'Servers info requested');
            const serversInfo = await Promise.all(
                Object.entries(config.mcp_servers).map(([name, server]) => 
                    checkServerHealth(name, server)
                )
            );
            
            const summary: ServerSummary = {
                total: serversInfo.length,
                ready: serversInfo.filter(s => s.status === 'ready').length,
                starting: serversInfo.filter(s => s.status === 'starting').length,
                stopping: serversInfo.filter(s => s.status === 'stopping').length,
                error: serversInfo.filter(s => s.status === 'error').length,
            };
            
            broadcastLog('info', `Summary: ${summary.ready} ready, ${summary.starting} starting, ${summary.stopping} stopping, ${summary.error} error`);
            
            res.json({
                servers: serversInfo,
                summary,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            broadcastLog('error', `Error checking server status: ${errorMsg}`);
            res.status(500).json({ 
                error: 'Failed to check server status',
                details: errorMsg,
                timestamp: new Date().toISOString()
            });
        }
    };
}

export function cleanup() {
    // Note: healthCheckInterval is now scoped to createServersHandler
    // This function remains for API compatibility
} 