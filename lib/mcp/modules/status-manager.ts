import { appLogger } from '@/lib/logger';
import { redisCacheManager, type CacheableServerInfo } from './redis-cache-manager';
import { mcpServiceRegistry } from './service-registry';
import {
  type ServerConfigEntry,
  type EnhancedTransportConfig as MCPTransportConfig,
  type AISDKToolCollection,
  type FetchedToolInfo as FetchedTool,
} from '../enhanced';

// Define MCPServiceStatus locally as it's a union type not directly exported
export type MCPServiceStatus = 'pending' | 'success' | 'error' | 'initializing' | 'no_tools_found' | 'disabled' | 'uninitialized';

export interface ManagedServerInfo {
  key: string;
  label: string;
  status: MCPServiceStatus;
  tools: Array<{ name: string; description?: string; inputSchema?: unknown; [key: string]: unknown }>; 
  errorDetails?: string;
  transportType: MCPTransportConfig['type'] | 'unknown';
}

// Interface for the combined data structure fetched from a server
export interface FetchedServerData {
  status: MCPServiceStatus;
  error?: string;
  tools: AISDKToolCollection | null;
  toolsCount?: number;
  displayName: string;
  serverKey: string;
  transportType: MCPTransportConfig['type'] | 'unknown';
  pid?: number;
  initializationTime?: number;
}

// Interface for what we expect a tool definition to contain for caching
interface ToolDefinitionLike {
  description?: string;
  inputSchema?: unknown;
}

export class ServerStatusManager {
  private static instance: ServerStatusManager;

  static getInstance(): ServerStatusManager {
    if (!ServerStatusManager.instance) {
      ServerStatusManager.instance = new ServerStatusManager();
    }
    return ServerStatusManager.instance;
  }

  /**
   * Get display transport type from server config
   */
  getDisplayTransportType(serverConfig: ServerConfigEntry): MCPTransportConfig['type'] | 'unknown' {
    if (serverConfig.transport?.type) {
      return serverConfig.transport.type;
    }
    if (serverConfig.url) return 'sse';
    if (serverConfig.command) return 'stdio';
    return 'unknown';
  }

  /**
   * Update server status in cache
   */
  async updateServerStatusInCache(
    serverKey: string, 
    serviceLabel: string, 
    fetchedResult: FetchedServerData
  ): Promise<void> {
    try {
      const toolsForCache: FetchedTool[] = [];
      if (fetchedResult.tools) {
        for (const toolName in fetchedResult.tools) {
          const toolDef = fetchedResult.tools[toolName] as ToolDefinitionLike;
          toolsForCache.push({
            name: toolName,
            description: toolDef?.description,
            inputSchema: toolDef?.inputSchema,
          });
        }
      }

      const infoToCache: CacheableServerInfo = {
        key: serverKey,
        label: serviceLabel,
        status: fetchedResult.status,
        tools: toolsForCache,
        errorDetails: fetchedResult.error,
        transportType: fetchedResult.transportType
      };

      await redisCacheManager.setServerStatus(serverKey, infoToCache);
    } catch (error: unknown) {
              appLogger.mcp?.error(`[Status Manager] Error updating cache for ${serviceLabel}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create disabled server info
   */
  createDisabledServerInfo(serverKey: string, serverConfig: ServerConfigEntry): ManagedServerInfo {
    const serviceLabel = serverConfig.label || serverKey;
    return {
      key: serverKey,
      label: serviceLabel,
      status: 'disabled',
      tools: [],
      transportType: this.getDisplayTransportType(serverConfig),
      errorDetails: 'This server is disabled in the configuration.'
    };
  }

  /**
   * Create error server info
   */
  createErrorServerInfo(serverKey: string, serverConfig: ServerConfigEntry, errorMessage: string): ManagedServerInfo {
    const serviceLabel = serverConfig.label || serverKey;
    return {
      key: serverKey,
      label: serviceLabel,
      status: 'error',
      tools: [],
      errorDetails: errorMessage,
      transportType: this.getDisplayTransportType(serverConfig),
    };
  }

  /**
   * Create uninitialized server info
   */
  createUninitializedServerInfo(serverKey: string, serverConfig: ServerConfigEntry): ManagedServerInfo {
    const serviceLabel = serverConfig.label || serverKey;
    return {
      key: serverKey,
      label: serviceLabel,
      status: 'uninitialized',
      tools: [],
      errorDetails: 'Status not yet available in cache. Awaiting next poll.',
      transportType: this.getDisplayTransportType(serverConfig),
    };
  }

  /**
   * Convert cached server info to managed server info
   */
  convertCachedToManagedInfo(cachedInfo: CacheableServerInfo): ManagedServerInfo {
    return {
      key: cachedInfo.key,
      label: cachedInfo.label,
      status: cachedInfo.status as MCPServiceStatus,
      tools: cachedInfo.tools as Array<{ name: string; description?: string; inputSchema?: unknown; [key: string]: unknown }>,
      errorDetails: cachedInfo.errorDetails,
      transportType: cachedInfo.transportType as MCPTransportConfig['type'] | 'unknown',
    };
  }

  /**
   * Get server status from a service
   */
  async getServerStatusFromService(
    serverKey: string, 
    serviceLabel: string
  ): Promise<FetchedServerData | null> {
    const service = mcpServiceRegistry.getService(serverKey);
    if (!service) {
      return null;
    }

    try {
      const statusResult = await service.getStatus();
      const toolsResult = await service.getTools();
      
      const combinedFetchedData: FetchedServerData = {
        status: statusResult.status,
        tools: toolsResult,
        error: statusResult.error || (toolsResult === null && statusResult.status === 'success' ? 'No tools found but status is success' : undefined),
        transportType: statusResult.transportType as FetchedServerData['transportType'], 
        displayName: serviceLabel,
        serverKey: serverKey,
        toolsCount: toolsResult ? Object.keys(toolsResult).length : 0,
      };

      return combinedFetchedData;
    } catch (error: unknown) {
      appLogger.mcp?.error(`[Status Manager] Error getting status from service ${serviceLabel}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Refresh server status and update cache
   */
  async refreshServerStatus(
    serverKey: string, 
    serviceLabel: string
  ): Promise<void> {
    const fetchedData = await this.getServerStatusFromService(serverKey, serviceLabel);
    if (fetchedData) {
      await this.updateServerStatusInCache(serverKey, serviceLabel, fetchedData);
    }
  }

  /**
   * Get server status with fallback to cache
   */
  async getServerStatusWithFallback(
    serverKey: string,
    serviceLabel: string
  ): Promise<ManagedServerInfo | null> {
    // Try to get fresh status from service
    const fetchedData = await this.getServerStatusFromService(serverKey, serviceLabel);
    if (fetchedData) {
      await this.updateServerStatusInCache(serverKey, serviceLabel, fetchedData);
      
      // Convert to ManagedServerInfo
      const toolsForManaged = fetchedData.tools ? 
        Object.entries(fetchedData.tools).map(([name, toolDef]) => {
          const def = toolDef as ToolDefinitionLike;
          return {
            name,
            description: def?.description,
            inputSchema: def?.inputSchema,
          };
        }) : [];

      return {
        key: serverKey,
        label: serviceLabel,
        status: fetchedData.status,
        tools: toolsForManaged,
        errorDetails: fetchedData.error,
        transportType: fetchedData.transportType,
      };
    }

    // Fallback to cached data
    const cachedInfo = await redisCacheManager.getServerStatus(serverKey);
    if (cachedInfo) {
      return this.convertCachedToManagedInfo(cachedInfo);
    }

    return null;
  }

  /**
   * Initialize server status for disabled server
   */
  async initializeDisabledServerStatus(serverKey: string, serverConfig: ServerConfigEntry): Promise<void> {
    const disabledInfo = this.createDisabledServerInfo(serverKey, serverConfig);
    const cacheableInfo: CacheableServerInfo = {
      key: disabledInfo.key,
      label: disabledInfo.label,
      status: disabledInfo.status,
      tools: disabledInfo.tools,
      errorDetails: disabledInfo.errorDetails,
      transportType: disabledInfo.transportType
    };
    
    await redisCacheManager.setServerStatus(serverKey, cacheableInfo);
  }

  /**
   * Initialize server status for error server
   */
  async initializeErrorServerStatus(serverKey: string, serverConfig: ServerConfigEntry, errorMessage: string): Promise<void> {
    const errorInfo = this.createErrorServerInfo(serverKey, serverConfig, errorMessage);
    const cacheableInfo: CacheableServerInfo = {
      key: errorInfo.key,
      label: errorInfo.label,
      status: errorInfo.status,
      tools: errorInfo.tools,
      errorDetails: errorInfo.errorDetails,
      transportType: errorInfo.transportType
    };
    
    await redisCacheManager.setServerStatus(serverKey, cacheableInfo);
  }

  /**
   * Get health summary of all servers
   */
  async getServerHealthSummary(): Promise<{
    total: number;
    healthy: number;
    errors: number;
    disabled: number;
    uninitialized: number;
  }> {
    // This would need to be called with server keys from the config
    // For now, return empty summary as we don't have access to config here
    return {
      total: 0,
      healthy: 0,
      errors: 0,
      disabled: 0,
      uninitialized: 0,
    };
  }
}

// Export singleton instance
export const serverStatusManager = ServerStatusManager.getInstance(); 