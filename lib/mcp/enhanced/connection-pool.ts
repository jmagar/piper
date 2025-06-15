import { appLogger } from '@/lib/logger';
import {
  MCPToolSet,
  MCPClientError,
  EnhancedStdioConfig,
  EnhancedSSEConfig,
  EnhancedStreamableHTTPConfig
} from './types';
import {
  createEnhancedStdioMCPClient,
  createEnhancedSSEMCPClient,
  createEnhancedStreamableHTTPMCPClient
} from './client-factory';

/**
 * Connection pool for managing multiple MCP clients
 */
export class MCPConnectionPool {
  private clients = new Map<string, MCPToolSet>()
  private timeouts = new Map<string, NodeJS.Timeout>()
  private connectionCount = 0

  async addStdioClient(
    id: string,
    config: EnhancedStdioConfig
  ): Promise<MCPToolSet> {
    if (this.clients.has(id)) {
      throw new MCPClientError(`Client with id '${id}' already exists`)
    }

    // Setup timeout if specified (but without abort functionality)
    if (config.timeout) {
      const timeoutId = setTimeout(() => {
        appLogger.mcp.warn(`[MCP Pool] Client '${id}' timed out after ${config.timeout}ms`)
        // Just log timeout - no abort functionality
      }, config.timeout)
      this.timeouts.set(id, timeoutId)
    }

    // Create client without abort signal
    const client = await createEnhancedStdioMCPClient(id, config)
    this.clients.set(id, client)
    this.connectionCount++
    
    appLogger.mcp.info(`[MCP Pool] Added stdio client '${id}'. Total connections: ${this.connectionCount}`)
    return client
  }

  async addSSEClient(
    id: string,
    config: EnhancedSSEConfig
  ): Promise<MCPToolSet> {
    if (this.clients.has(id)) {
      throw new MCPClientError(`Client with id '${id}' already exists`)
    }

    const client = await createEnhancedSSEMCPClient(id, config)
    this.clients.set(id, client)
    this.connectionCount++
    
    appLogger.mcp.info(`[MCP Pool] Added SSE client '${id}'. Total connections: ${this.connectionCount}`)
    return client
  }

  async addStreamableHTTPClient(
    id: string,
    config: EnhancedStreamableHTTPConfig
  ): Promise<MCPToolSet> {
    if (this.clients.has(id)) {
      throw new MCPClientError(`Client with id '${id}' already exists`)
    }

    const client = await createEnhancedStreamableHTTPMCPClient(id, config)
    this.clients.set(id, client)
    this.connectionCount++
    
    appLogger.mcp.info(`[MCP Pool] Added StreamableHTTP client '${id}'. Total connections: ${this.connectionCount}`)
    return client
  }

  getClient(id: string): MCPToolSet | undefined {
    return this.clients.get(id)
  }

  hasClient(id: string): boolean {
    return this.clients.has(id)
  }

  listClients(): string[] {
    return Array.from(this.clients.keys())
  }

  async removeClient(id: string): Promise<boolean> {
    const client = this.clients.get(id)
    if (!client) return false

    // Clear timeout if exists
    const timeoutId = this.timeouts.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.timeouts.delete(id)
    }

    try {
      await client.close()
      this.clients.delete(id)
      this.connectionCount--
      
      appLogger.mcp.info(`[MCP Pool] Removed client '${id}'. Total connections: ${this.connectionCount}`)
      return true
    } catch (error) {
      appLogger.mcp.error(`[MCP Pool] Error removing client '${id}'`, error as Error)
      throw new MCPClientError(`Failed to remove client '${id}'`)
    }
  }

  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.clients.entries()).map(
      async ([id, client]) => {
        try {
          await client.close()
          appLogger.mcp.info(`[MCP Pool] Closed client '${id}'`)
        } catch (error) {
          appLogger.mcp.error(`[MCP Pool] Error closing client '${id}'`, error as Error)
        }
      }
    )

    // Clear all timeouts
    for (const timeoutId of this.timeouts.values()) {
      clearTimeout(timeoutId)
    }
    this.timeouts.clear()

    await Promise.allSettled(closePromises)
    this.clients.clear()
    this.connectionCount = 0
    
    appLogger.mcp.info('[MCP Pool] All clients closed')
  }

  async closeClient(id: string): Promise<boolean> {
    return this.removeClient(id)
  }

  getStats() {
    return {
      totalConnections: this.connectionCount,
      activeClients: Array.from(this.clients.keys()),
      hasTimeouts: this.timeouts.size > 0,
      timeoutCount: this.timeouts.size
    }
  }

  getConnectionCount(): number {
    return this.connectionCount
  }

  async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = []
    
    // Check for stale timeouts
    if (this.timeouts.size > this.clients.size) {
      issues.push(`Timeout count (${this.timeouts.size}) exceeds client count (${this.clients.size})`)
    }

    // Check connection count consistency
    if (this.connectionCount !== this.clients.size) {
      issues.push(`Connection count (${this.connectionCount}) doesn't match clients map size (${this.clients.size})`)
      this.connectionCount = this.clients.size // Fix inconsistency
    }

    return {
      healthy: issues.length === 0,
      issues
    }
  }

  async cleanup(): Promise<void> {
    appLogger.mcp.info('[MCP Pool] Starting cleanup...')
    
    // Run health check and log issues
    const healthCheck = await this.healthCheck()
    if (!healthCheck.healthy) {
      appLogger.mcp.warn('[MCP Pool] Health check issues during cleanup:', healthCheck.issues)
    }

    // Close all clients
    await this.closeAll()
    
    appLogger.mcp.info('[MCP Pool] Cleanup completed')
  }
}

// Global connection pool instance
export const globalMCPPool = new MCPConnectionPool() 