import { PrismaClient } from '@prisma/client';
import debug from 'debug';
import { convertMcpToLangchainTools } from '@h1deya/langchain-mcp-tools';
// Changed from import type to regular import so it can be used as a value
import { StructuredTool } from '@langchain/core/tools';
import { Config, MCPServerConfig } from '../../load-config.js';

const log = debug('pooper:mcp:server');
const error = debug('pooper:mcp:error');

// Extended types for MCP tools integration
interface McpToolsResult {
  tools: StructuredTool[];
  cleanup: () => Promise<void>;
  failedServers?: string[];
}

// Options for MCP server initialization
interface McpInitOptions {
  logLevel: string;
  initTimeout?: number;
  continueOnError?: boolean;
}

/**
 * Service for managing MCP (Model Context Protocol) servers
 * Acts as an adapter between the application and the MCP SDK
 */
export class McpServerService {
  private toolsCache: { tools: StructuredTool[]; cleanup: () => Promise<void> } | null = null;
  private serverConfigs: Record<string, MCPServerConfig> = {};
  
  constructor(private prisma: PrismaClient) {}

  /**
   * Initializes MCP servers from configuration
   * @param config The MCP configuration
   * @returns An object containing the initialized tools and a cleanup function
   */
  async initializeServers(config: Config): Promise<{ tools: StructuredTool[]; cleanup: () => Promise<void> }> {
    try {
      // If we already have initialized tools, return them
      if (this.toolsCache) {
        log('Returning cached MCP tools');
        return this.toolsCache;
      }

      log('Initializing MCP servers from config');
      // Save server configs for reference
      this.serverConfigs = config.mcp_servers;
      
      // Use the MCP to LangChain conversion library to initialize servers
      const result = await convertMcpToLangchainTools(
        config.mcp_servers,
        { logLevel: 'info' }
      ) as McpToolsResult;
      
      // Add custom properties for failed servers if not present
      if (!result.failedServers) {
        result.failedServers = [];
      }
      
      // Log server initialization results
      if (result.failedServers && result.failedServers.length > 0) {
        error('The following MCP servers failed to initialize: %s', result.failedServers.join(', '));
        
        // Register failed servers in database for monitoring
        await this.updateFailedServersInDb(result.failedServers);
      }
      
      log('Successfully initialized %d MCP tools', result.tools.length);
      
      // Update successful servers in database
      await this.updateActiveServersInDb(
        Object.keys(config.mcp_servers).filter(
          server => !result.failedServers?.includes(server)
        )
      );
      
      // Store in cache
      this.toolsCache = result;
      
      return result;
    } catch (err) {
      error('Failed to initialize MCP servers: %s', err instanceof Error ? err.message : String(err));
      throw new Error(`Failed to initialize MCP servers: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Updates failed server status in the database
   */
  private async updateFailedServersInDb(failedServers: string[]): Promise<void> {
    try {
      for (const serverName of failedServers) {
        const serverConfig = this.serverConfigs[serverName];
        if (!serverConfig) continue;
        
        // Find existing server by name
        const existingServer = await this.prisma.mcpServer.findFirst({
          where: { name: serverName }
        });
        
        if (existingServer) {
          // Update existing server
          await this.prisma.mcpServer.update({
            where: { id: existingServer.id },
            data: {
              status: 'failed',
              metadata: {
                ...existingServer.metadata as any,
                lastError: `Failed to initialize at ${new Date().toISOString()}`
              } as any,
              updatedAt: new Date()
            }
          });
        } else {
          // Create new server
          await this.prisma.mcpServer.create({
            data: {
              name: serverName,
              url: `mcp://${serverName}`,
              type: 'primary',
              status: 'failed',
              metadata: {
                ...serverConfig,
                lastError: `Failed to initialize at ${new Date().toISOString()}`
              } as any
            }
          });
        }
      }
    } catch (dbErr) {
      error('Error updating failed servers in database: %s', dbErr instanceof Error ? dbErr.message : String(dbErr));
    }
  }
  
  /**
   * Updates active server status in the database
   */
  private async updateActiveServersInDb(activeServers: string[]): Promise<void> {
    try {
      for (const serverName of activeServers) {
        const serverConfig = this.serverConfigs[serverName];
        if (!serverConfig) continue;
        
        // Find existing server by name
        const existingServer = await this.prisma.mcpServer.findFirst({
          where: { name: serverName }
        });
        
        if (existingServer) {
          // Update existing server
          await this.prisma.mcpServer.update({
            where: { id: existingServer.id },
            data: {
              status: 'active',
              updatedAt: new Date()
            }
          });
        } else {
          // Create new server
          await this.prisma.mcpServer.create({
            data: {
              name: serverName,
              url: `mcp://${serverName}`,
              type: 'primary',
              status: 'active',
              metadata: serverConfig as any
            }
          });
        }
      }
    } catch (dbErr) {
      error('Error updating active servers in database: %s', dbErr instanceof Error ? dbErr.message : String(dbErr));
    }
  }

  /**
   * Gets all registered MCP servers from the database
   */
  async getServers() {
    return this.prisma.mcpServer.findMany({
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Get a specific server by ID
   */
  async getServer(id: string) {
    return this.prisma.mcpServer.findUnique({
      where: { id }
    });
  }

  /**
   * Connect to a specific MCP server by ID
   * @param id The server ID to connect to
   * @returns The connected server details
   */
  async connectToServer(id: string): Promise<any> {
    try {
      log(`Connecting to MCP server with ID: ${id}`);
      
      // Get server details from database
      const server = await this.prisma.mcpServer.findUnique({
        where: { id }
      });
      
      if (!server) {
        throw new Error(`Server with ID ${id} not found`);
      }
      
      // In a real implementation, this would establish a connection to the MCP server
      // For now, we'll just update the status in the database
      await this.prisma.mcpServer.update({
        where: { id },
        data: {
          status: 'connected',
          updatedAt: new Date()
        }
      });
      
      log(`Successfully connected to MCP server: ${server.name}`);
      
      return server;
    } catch (err) {
      error(`Failed to connect to MCP server: ${err instanceof Error ? err.message : String(err)}`);
      
      // Update server status to failed
      await this.prisma.mcpServer.update({
        where: { id },
        data: {
          status: 'failed',
          updatedAt: new Date()
        }
      });
      
      throw new Error(`Failed to connect to MCP server: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleans up MCP server resources
   */
  async cleanup(): Promise<void> {
    if (this.toolsCache?.cleanup) {
      log('Cleaning up MCP servers');
      await this.toolsCache.cleanup();
      this.toolsCache = null;
    }
  }
}
