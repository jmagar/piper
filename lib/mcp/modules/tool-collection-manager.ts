import { ToolSet } from "ai";
import { appLogger } from '@/lib/logger';
import { getCurrentCorrelationId } from '@/lib/logger/correlation';
import { mcpServiceRegistry } from './service-registry';
import { getCachedAppConfig as getAppConfig } from '../enhanced';
import { toolDefinitionCompressor } from './tool-definition-compressor';

/**
 * Validates a tool definition to ensure it has the required structure for AI SDK
 */
function isValidToolDefinition(toolDefinition: unknown): toolDefinition is NonNullable<ToolSet[string]> {
  if (!toolDefinition || typeof toolDefinition !== 'object') {
    return false;
  }
  
  // Check for required AI SDK tool properties
  const tool = toolDefinition as Record<string, unknown>;
  return (
    typeof tool.description === 'string' || tool.description === undefined
  ) && (
    typeof tool.parameters === 'object' && tool.parameters !== null
  ) && (
    typeof tool.execute === 'function' || tool.execute === undefined
  );
}

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
        serverCount: serversInfo.length
      });

      // Process each connected server
      for (const server of serversInfo) {
        if (server.status === 'success' && server.hasActiveTools) {
          const service = mcpServiceRegistry.getService(server.key);
          if (service) {
            try {
              const tools = await service.getTools();
              
              // Critical fix: Properly handle null/undefined tools
              if (!tools) {
                appLogger.warn(`[Tool Collection Manager] ⚠️ Service returned null/undefined tools for '${server.label}'`, {
                  correlationId: getCurrentCorrelationId(),
                  operationId: 'tool_collection_server_null_tools',
                  serverKey: server.key, 
                  serverLabel: server.label
                });
                continue;
              }

              if (typeof tools !== 'object') {
                appLogger.error(`[Tool Collection Manager] ❌ Service returned invalid tools type for '${server.label}' - expected object, got ${typeof tools}`, {
                  correlationId: getCurrentCorrelationId(),
                  operationId: 'tool_collection_server_invalid_tools_type',
                  serverKey: server.key, 
                  serverLabel: server.label,
                  toolsType: typeof tools
                });
                continue;
              }

              const toolEntries = Object.entries(tools);
              if (toolEntries.length === 0) {
                appLogger.debug(`[Tool Collection Manager] No tools found in tools object for '${server.label}'`, {
                  correlationId: getCurrentCorrelationId(),
                  operationId: 'tool_collection_server_empty_tools',
                  serverKey: server.key, 
                  serverLabel: server.label
                });
                continue;
              }

              appLogger.info(`[Tool Collection Manager] ✅ Loaded ${toolEntries.length} tools from '${server.label}' (${server.transportType})`, {
                correlationId: getCurrentCorrelationId(),
                operationId: 'tool_collection_server_loaded',
                serverKey: server.key, 
                serverLabel: server.label, 
                toolCount: toolEntries.length,
                transportType: server.transportType
              });
              
              let validToolCount = 0;
              let invalidToolCount = 0;

              toolEntries.forEach(([toolName, toolDefinition]) => {
                const prefixedToolName = `${server.key}_${toolName}`;
                
                // Validate tool definition before adding to collection
                if (!isValidToolDefinition(toolDefinition)) {
                  appLogger.error(`[Tool Collection Manager] ❌ Invalid tool definition for '${prefixedToolName}' - missing required properties`, {
                    correlationId: getCurrentCorrelationId(),
                    operationId: 'tool_collection_invalid_tool_definition',
                    toolName: prefixedToolName,
                    serverKey: server.key,
                    toolDefinition: toolDefinition // Log the actual definition for debugging
                  });
                  invalidToolCount++;
                  return; // Skip this tool
                }
                
                // Safe assignment - we've validated the tool definition
                combinedTools[prefixedToolName] = toolDefinition;
                validToolCount++;
                
                appLogger.debug(`[Tool Collection Manager] ✅ Added tool '${prefixedToolName}' to collection`, {
                  correlationId: getCurrentCorrelationId(),
                  operationId: 'tool_collection_tool_added',
                  toolName: prefixedToolName,
                  serverKey: server.key
                });
              });

              if (invalidToolCount > 0) {
                appLogger.warn(`[Tool Collection Manager] ⚠️ Skipped ${invalidToolCount} invalid tools from '${server.label}', added ${validToolCount} valid tools`, {
                  correlationId: getCurrentCorrelationId(),
                  operationId: 'tool_collection_server_partial_success',
                  serverKey: server.key, 
                  serverLabel: server.label,
                  validToolCount,
                  invalidToolCount
                });
              }
              
            } catch (error) {
              appLogger.error(`[Tool Collection Manager] ❌ Error loading tools from '${server.label}'`, {
                correlationId: getCurrentCorrelationId(),
                operationId: 'tool_collection_server_error',
                serverKey: server.key, serverLabel: server.label,
                error: error as Error
              });
            }
          }
        } else {
          appLogger.debug(`[Tool Collection Manager] Skipping server '${server.label}' (status: ${server.status}, hasTools: ${server.hasActiveTools})`, {
            correlationId: getCurrentCorrelationId(),
            operationId: 'tool_collection_server_skipped',
            serverKey: server.key, 
            serverLabel: server.label, 
            status: server.status, 
            hasActiveTools: server.hasActiveTools
          });
        }
      }
      
      const toolCount = Object.keys(combinedTools).length;
      appLogger.info(`[Tool Collection Manager] 🎉 Successfully loaded ${toolCount} total tools`, {
        correlationId: getCurrentCorrelationId(),
        operationId: 'tool_collection_completed',
        totalToolCount: toolCount
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
        serverKey
      });
      return {};
    }

    try {
      const tools = await service.getTools();
      
      // Apply the same validation as in getCombinedMCPToolsForAISDK
      if (!tools) {
        appLogger.warn(`[Tool Collection Manager] ⚠️ Service returned null/undefined tools for server '${serverKey}'`, {
          correlationId: getCurrentCorrelationId(),
          operationId: 'tool_collection_server_null_tools',
          serverKey
        });
        return {};
      }

      if (typeof tools !== 'object') {
        appLogger.error(`[Tool Collection Manager] ❌ Service returned invalid tools type for server '${serverKey}' - expected object, got ${typeof tools}`, {
          correlationId: getCurrentCorrelationId(),
          operationId: 'tool_collection_server_invalid_tools_type',
          serverKey,
          toolsType: typeof tools
        });
        return {};
      }

      const toolSet: ToolSet = {};
      let validToolCount = 0;
      let invalidToolCount = 0;

      Object.entries(tools).forEach(([toolName, toolDefinition]) => {
        const prefixedToolName = `${serverKey}_${toolName}`;
        
        if (!isValidToolDefinition(toolDefinition)) {
          appLogger.error(`[Tool Collection Manager] ❌ Invalid tool definition for '${prefixedToolName}'`, {
            correlationId: getCurrentCorrelationId(),
            operationId: 'tool_collection_invalid_tool_definition',
            toolName: prefixedToolName,
            serverKey
          });
          invalidToolCount++;
          return;
        }
        
        toolSet[prefixedToolName] = toolDefinition;
        validToolCount++;
      });
      
      appLogger.info(`[Tool Collection Manager] Loaded ${validToolCount} valid tools from server '${serverKey}' (${invalidToolCount} invalid skipped).`, {
        correlationId: getCurrentCorrelationId(),
        operationId: 'tool_collection_server_loaded',
        serverKey, 
        validToolCount,
        invalidToolCount
      });
      
      return toolSet;
    } catch (error) {
      appLogger.error(`[Tool Collection Manager] Error loading tools from server '${serverKey}'`, {
        correlationId: getCurrentCorrelationId(),
        operationId: 'tool_collection_server_error',
        serverKey,
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
              serverKey: server.key, serverLabel: server.label,
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
      let status = server.status;

      if (server.status === 'success' && server.hasActiveTools) {
        const service = mcpServiceRegistry.getService(server.key);
        if (service) {
          try {
            const tools = await service.getTools();
            toolCount = tools ? Object.keys(tools).length : 0;
            totalTools += toolCount;
          } catch (error) {
            status = 'error-tool-count';
            appLogger.error(`[Tool Collection Manager] Error getting tool count from server '${server.label}'`, {
              correlationId: getCurrentCorrelationId(),
              operationId: 'tool_collection_server_tool_count_error',
              serverKey: server.key, 
              serverLabel: server.label,
              error: error as Error
            });
          }
        }
      }

      toolsByServer.push({
        serverKey: server.key,
        serverLabel: server.label,
        toolCount,
        status,
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
            serverKey,
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

  // Removed validateToolSchema function - AI SDK handles MCP tool schema conversion automatically

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