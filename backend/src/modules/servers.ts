import type { Request, Response } from 'express';
import { StructuredTool } from '@langchain/core/tools';
import { broadcastLog } from '../utils/logger.js';
import { Config, MCPServerConfig } from '../types/index.js';

export function createServersHandler(config: Config, tools: StructuredTool[]) {
    return async function handleServersInfo(_req: Request, res: Response): Promise<void> {
        try {
            broadcastLog('info', 'Servers info requested');
            const serversInfo = await Promise.all(
                Object.entries(config.mcp_servers).map(async ([name, server]: [string, MCPServerConfig]) => {
                    try {
                        // Find all tools associated with this server
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
    };
} 