import { ToolSet } from "ai";
import { appLogger } from '@/lib/logger';
import { getCurrentCorrelationId } from '@/lib/logger/correlation';
import { mcpServiceRegistry } from './service-registry';
import { getCachedAppConfig as getAppConfig } from '../enhanced';
import { toolDefinitionCompressor } from './tool-definition-compressor';

export class ToolCollectionManager {
  private static instance: ToolCollectionManager;

  static getInstance(): ToolCollectionManager {
    if (!ToolCollectionManager.instance) {
      ToolCollectionManager.instance = new ToolCollectionManager();
    }
    return ToolCollectionManager.instance;
  }

  /**
   * Get combined MCP tools for AI SDK usage
   */
  async getCombinedMCPToolsForAISDK(): Promise<ToolSet> {
    try {
      const combinedTools: ToolSet = {};
      const serversInfo = await this.getActiveServersInfo();

      appLogger.info(`[Tool Collection Manager] Processing ${serversInfo.length} servers for tool collection...`, {
        correlationId: getCurrentCorrelationId(),
        operationId: 'tool_collection_start',
        args: { serverCount: serversInfo.length }
      });

      // Process each connected server
      for (const server of serversInfo) {
        if (server.status === 'success' && server.hasActiveTools) {
          const service = mcpServiceRegistry.getService(server.key);
          if (service) {
            try {
              const tools = await service.getTools();
              if (tools) {
                appLogger.info(`[Tool Collection Manager] ✅ Loaded ${Object.keys(tools).length} tools from '${server.label}' (${server.transportType})`, {
                  correlationId: getCurrentCorrelationId(),
                  operationId: 'tool_collection_server_loaded',
                  args: { 
                    serverKey: server.key, 
                    serverLabel: server.label, 
                    toolCount: Object.keys(tools).length,
                    transportType: server.transportType
                  }
                });
                
                Object.entries(tools).forEach(([toolName, toolDefinition]) => {
                  const prefixedToolName = `${server.key}_${toolName}`;
                  combinedTools[prefixedToolName] = toolDefinition as NonNullable<ToolSet[string]>;
                });
              } else {
                appLogger.warn(`[Tool Collection Manager] ⚠️ No tools found for server '${server.label}' despite success status`, {
                  correlationId: getCurrentCorrelationId(),
                  operationId: 'tool_collection_server_no_tools',
                  args: { serverKey: server.key, serverLabel: server.label }
                });
              }
            } catch (error) {
              appLogger.error(`[Tool Collection Manager] ❌ Error loading tools from '${server.label}'`, {
                correlationId: getCurrentCorrelationId(),
                operationId: 'tool_collection_server_error',
                args: { serverKey: server.key, serverLabel: server.label },
                error: error as Error
              });
            }
          }
        } else {
          appLogger.debug(`[Tool Collection Manager] Skipping server '${server.label}' (status: ${server.status}, hasTools: ${server.hasActiveTools})`, {
            correlationId: getCurrentCorrelationId(),
            operationId: 'tool_collection_server_skipped',
            args: { 
              serverKey: server.key, 
              serverLabel: server.label, 
              status: server.status, 
              hasActiveTools: server.hasActiveTools 
            }
          });
        }
      }
      
      const toolCount = Object.keys(combinedTools).length;
      appLogger.info(`[Tool Collection Manager] 🎉 Successfully loaded ${toolCount} total tools`, {
        correlationId: getCurrentCorrelationId(),
        operationId: 'tool_collection_completed',
        args: { totalToolCount: toolCount }
      });
      
      // Apply tool definition compression for token optimization
      const compressedTools = await toolDefinitionCompressor.compressToolDefinitions(combinedTools);
      
      return compressedTools;
    } catch (error) {
      appLogger.error(`[Tool Collection Manager] ❌ A critical error occurred during the tool collection process. Returning an empty toolset`, {
        correlationId: getCurrentCorrelationId(),
        operationId: 'tool_collection_critical_error',
        error: error as Error
      });
      return {}; // Return empty toolset to prevent crashing the chat flow
    }
  }

  /**
   * Get tools from a specific server
   */
  async getToolsFromServer(serverKey: string): Promise<ToolSet> {
    const service = mcpServiceRegistry.getService(serverKey);
    if (!service) {
      appLogger.warn(`[Tool Collection Manager] Server '${serverKey}' not found in registry.`, {
        correlationId: getCurrentCorrelationId(),
        operationId: 'tool_collection_server_not_found',
        args: { serverKey }
      });
      return {};
    }

    try {
      const tools = await service.getTools();
      if (tools) {
        const toolSet: ToolSet = {};
        Object.entries(tools).forEach(([toolName, toolDefinition]) => {
          const prefixedToolName = `${serverKey}_${toolName}`;
          toolSet[prefixedToolName] = toolDefinition as NonNullable<ToolSet[string]>;
        });
        
        appLogger.info(`[Tool Collection Manager] Loaded ${Object.keys(toolSet).length} tools from server '${serverKey}'.`, {
          correlationId: getCurrentCorrelationId(),
          operationId: 'tool_collection_server_loaded',
          args: { serverKey, toolCount: Object.keys(tools).length }
        });
        return toolSet;
      }
    } catch (error) {
      appLogger.error(`[Tool Collection Manager] Error loading tools from server '${serverKey}'`, {
        correlationId: getCurrentCorrelationId(),
        operationId: 'tool_collection_server_error',
        args: { serverKey },
        error: error as Error
      });
    }

    return {};
  }

  /**
   * Get tool information without prefixes (for display purposes)
   */
  async getToolsInfo(): Promise<Array<{
    serverKey: string;
    serverLabel: string;
    toolName: string;
    prefixedName: string;
    description?: string;
    transportType: string;
  }>> {
    const toolsInfo: Array<{
      serverKey: string;
      serverLabel: string;
      toolName: string;
      prefixedName: string;
      description?: string;
      transportType: string;
    }> = [];

    const serversInfo = await this.getActiveServersInfo();

    for (const server of serversInfo) {
      if (server.status === 'success' && server.hasActiveTools) {
        const service = mcpServiceRegistry.getService(server.key);
        if (service) {
          try {
            const tools = await service.getTools();
            if (tools) {
              Object.entries(tools).forEach(([toolName, toolDefinition]) => {
                const toolDef = toolDefinition as { description?: string };
                toolsInfo.push({
                  serverKey: server.key,
                  serverLabel: server.label,
                  toolName,
                  prefixedName: `${server.key}_${toolName}`,
                  description: toolDef?.description,
                  transportType: server.transportType,
                });
              });
            }
          } catch (error) {
            appLogger.error(`[Tool Collection Manager] Error getting tool info from server '${server.label}'`, {
              correlationId: getCurrentCorrelationId(),
              operationId: 'tool_collection_server_info_error',
              args: { serverKey: server.key, serverLabel: server.label },
              error: error as Error
            });
          }
        }
      }
    }

    return toolsInfo;
  }

  /**
   * Check if a prefixed tool name belongs to a specific server
   */
  getServerKeyFromPrefixedToolName(prefixedToolName: string): string | null {
    const parts = prefixedToolName.split('_');
    if (parts.length >= 2) {
      const serverKey = parts[0];
      if (mcpServiceRegistry.hasService(serverKey)) {
        return serverKey;
      }
    }
    return null;
  }

  /**
   * Remove server prefix from tool name
   */
  getUnprefixedToolName(prefixedToolName: string): string {
    const parts = prefixedToolName.split('_');
    if (parts.length >= 2) {
      return parts.slice(1).join('_');
    }
    return prefixedToolName;
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(): Promise<{
    totalServers: number;
    activeServers: number;
    totalTools: number;
    toolsByServer: Array<{
      serverKey: string;
      serverLabel: string;
      toolCount: number;
      status: string;
    }>;
  }> {
    const serversInfo = await this.getActiveServersInfo();
    const activeServers = serversInfo.filter(s => s.status === 'success' && s.hasActiveTools);
    
    let totalTools = 0;
    const toolsByServer: Array<{
      serverKey: string;
      serverLabel: string;
      toolCount: number;
      status: string;
    }> = [];

    for (const server of serversInfo) {
      let toolCount = 0;
      
      if (server.status === 'success') {
        const service = mcpServiceRegistry.getService(server.key);
        if (service) {
          try {
            const tools = await service.getTools();
            toolCount = tools ? Object.keys(tools).length : 0;
            totalTools += toolCount;
          } catch (error) {
            appLogger.error(`[Tool Collection Manager] Error counting tools for ${server.label}`, {
              correlationId: getCurrentCorrelationId(),
              operationId: 'tool_collection_server_tool_count_error',
              args: { serverKey: server.key, serverLabel: server.label },
              error: error as Error
            });
          }
        }
      }

      toolsByServer.push({
        serverKey: server.key,
        serverLabel: server.label,
        toolCount,
        status: server.status,
      });
    }

    return {
      totalServers: serversInfo.length,
      activeServers: activeServers.length,
      totalTools,
      toolsByServer,
    };
  }

  /**
   * Get servers that are active and potentially have tools
   */
  private async getActiveServersInfo(): Promise<Array<{
    key: string;
    label: string;
    status: string;
    hasActiveTools: boolean;
    transportType: string;
  }>> {
    const appConfig = await getAppConfig();
    if (!appConfig?.mcpServers) {
      return [];
    }

    const serversInfo: Array<{
      key: string;
      label: string;
      status: string;
      hasActiveTools: boolean;
      transportType: string;
    }> = [];

    const registryStats = mcpServiceRegistry.getRegistryStats();
    
    for (const serverKey of registryStats.servicesWithKeys) {
      const serverConfig = appConfig.mcpServers[serverKey];
      if (!serverConfig || serverConfig.disabled) {
        continue;
      }

      const service = mcpServiceRegistry.getService(serverKey);
      if (service) {
        try {
          const statusResult = await service.getStatus();
          const tools = await service.getTools();
          const hasActiveTools = tools ? Object.keys(tools).length > 0 : false;

          serversInfo.push({
            key: serverKey,
            label: serverConfig.label || serverKey,
            status: statusResult.status,
            hasActiveTools,
            transportType: statusResult.transportType || 'unknown',
          });
        } catch (error) {
          appLogger.error(`[Tool Collection Manager] Error getting status for server '${serverKey}'`, {
            correlationId: getCurrentCorrelationId(),
            operationId: 'tool_collection_server_status_error',
            args: { serverKey },
            error: error as Error
          });
          serversInfo.push({
            key: serverKey,
            label: serverConfig.label || serverKey,
            status: 'error',
            hasActiveTools: false,
            transportType: 'unknown',
          });
        }
      }
    }

    return serversInfo;
  }

  /**
   * Validate that a tool exists in the collection
   */
  async validateToolExists(prefixedToolName: string): Promise<boolean> {
    const serverKey = this.getServerKeyFromPrefixedToolName(prefixedToolName);
    if (!serverKey) {
      return false;
    }

    const unprefixedName = this.getUnprefixedToolName(prefixedToolName);
    const service = mcpServiceRegistry.getService(serverKey);
    
    if (service) {
      try {
        const tools = await service.getTools();
        return tools ? Object.prototype.hasOwnProperty.call(tools, unprefixedName) : false;
      } catch (error) {
        appLogger.error(`[Tool Collection Manager] Error validating tool '${prefixedToolName}'`, {
          correlationId: getCurrentCorrelationId(),
          operationId: 'tool_collection_tool_validation_error',
          args: { prefixedToolName },
          error: error as Error
        });
      }
    }

    return false;
  }
}

// Export singleton instance
export const toolCollectionManager = ToolCollectionManager.getInstance(); 