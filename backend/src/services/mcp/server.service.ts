import type { PrismaClient } from '@prisma/client';
import WebSocket from 'ws';

import type { Server } from '../../generated/model/server';
import type { Tool } from '../../generated/model/tool.js';

export class McpServerService {
  private connections: Map<string, WebSocket> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(private prisma: PrismaClient) {}

  async connectToServer(serverId: string): Promise<void> {
    const server = await this.prisma.mcpServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    // Clear any existing reconnect timer
    const existingTimer = this.reconnectTimers.get(serverId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.reconnectTimers.delete(serverId);
    }

    // Close existing connection if any
    const existingConnection = this.connections.get(serverId);
    if (existingConnection) {
      existingConnection.close();
      this.connections.delete(serverId);
    }

    try {
      const ws = new WebSocket(server.url);

      ws.on('open', () => {
        console.log(`Connected to MCP server ${server.name} (${server.url})`);
        this.connections.set(serverId, ws);

        // Send initial handshake
        ws.send(JSON.stringify({
          type: 'handshake',
          version: '1.0.0',
          capabilities: ['tools', 'events', 'logs']
        }));
      });

      ws.on('message', async (data: string) => {
        try {
          const message = JSON.parse(data);
          await this.handleServerMessage(serverId, message);
        } catch (error) {
          console.error(`Error handling message from server ${serverId}:`, error);
        }
      });

      ws.on('close', () => {
        console.log(`Disconnected from MCP server ${server.name}`);
        this.connections.delete(serverId);
        this.scheduleReconnect(serverId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for server ${server.name}:`, error);
        ws.close();
      });

    } catch (error) {
      console.error(`Failed to connect to MCP server ${server.name}:`, error);
      this.scheduleReconnect(serverId);
    }
  }

  private scheduleReconnect(serverId: string): void {
    // Exponential backoff for reconnection attempts
    const timer = setTimeout(async () => {
      try {
        await this.connectToServer(serverId);
      } catch (error) {
        console.error(`Reconnection attempt failed for server ${serverId}:`, error);
      }
    }, 5000); // Start with 5 second delay

    this.reconnectTimers.set(serverId, timer);
  }

  private async handleServerMessage(serverId: string, message: unknown): Promise<void> {
    switch (message.type) {
      case 'handshake_response':
        await this.handleHandshakeResponse(serverId, message);
        break;
      case 'tool_response':
        await this.handleToolResponse(serverId, message);
        break;
      case 'event':
        await this.handleEvent(serverId, message);
        break;
      case 'log':
        await this.handleLog(serverId, message);
        break;
      default:
        console.warn(`Unknown message type from server ${serverId}:`, message);
    }
  }

  private async handleHandshakeResponse(serverId: string, message: unknown): Promise<void> {
    // Update server capabilities in database
    await this.prisma.mcpServer.update({
      where: { id: serverId },
      data: {
        metadata: {
          capabilities: message.capabilities,
          version: message.version
        }
      }
    });
  }

  private async handleToolResponse(serverId: string, message: unknown): Promise<void> {
    // Store tool execution result
    await this.prisma.toolResult.create({
      data: {
        tool_name: message.tool,
        input_hash: message.input_hash,
        result: message.result,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });
  }

  private async handleEvent(serverId: string, message: unknown): Promise<void> {
    // Log event for monitoring
    console.log(`Event from server ${serverId}:`, message);
  }

  private async handleLog(serverId: string, message: unknown): Promise<void> {
    // Store log message
    console.log(`Log from server ${serverId}:`, message);
  }

  async executeTool(serverId: string, tool: string, params: unknown): Promise<unknown> {
    const connection = this.connections.get(serverId);
    if (!connection) {
      throw new Error(`Not connected to server ${serverId}`);
    }

    // Check cache first
    const inputHash = Buffer.from(JSON.stringify(params)).toString('base64');
    const cachedResult = await this.prisma.toolResult.findUnique({
      where: {
        tool_name_input_hash: {
          tool_name: tool,
          input_hash: inputHash
        }
      }
    });

    if (cachedResult && cachedResult.expires_at > new Date()) {
      return cachedResult.result;
    }

    // Send tool execution request
    connection.send(JSON.stringify({
      type: 'execute_tool',
      tool,
      params
    }));

    // Return promise that resolves when tool response is received
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Tool execution timed out'));
      }, 30000); // 30 second timeout

      connection.once('message', (data: string) => {
        clearTimeout(timeout);
        try {
          const response = JSON.parse(data);
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.result);
          }
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}
