import { Tool, ToolSet } from "ai";
import { appLogger } from '@/lib/logger';
import { getCurrentCorrelationId } from '@/lib/logger/correlation';
import { mcpServiceRegistry } from './modules/service-registry';

/**
 * Direct Enhanced MCP Tools Access
 * Replaces legacy tool-collection-manager with direct Enhanced MCP client access
 * 
 * This function provides the same interface as the legacy getCombinedMCPToolsForAISDK()
 * but uses the Enhanced MCP Client system directly, eliminating the typeName error
 * and providing better validation, metrics, and error handling.
 */
export async function getEnhancedMCPToolsForAISDK(): Promise<ToolSet> {
  const correlationId = getCurrentCorrelationId();
  
  try {
    const combinedTools: ToolSet = {};
    
    // Get all Enhanced MCP services directly from registry
    const allServices = mcpServiceRegistry.getAllServices();
    const serverCount = allServices.size;
    
    appLogger.info(`[Enhanced MCP Tools] Processing ${serverCount} Enhanced MCP services for tool collection...`, {
      correlationId,
      operationId: 'enhanced_mcp_tool_collection_start',
      serverCount
    });

    let totalToolCount = 0;
    let successfulServers = 0;
    let errorServers = 0;

    // Process each Enhanced MCP service
    for (const [serverKey, managedClient] of allServices) {
      try {
        // Get tools directly from Enhanced MCP client
        const tools = await managedClient.getTools();
        
        // Enhanced MCP client already handles null/undefined validation
        if (!tools) {
          appLogger.debug(`[Enhanced MCP Tools] No tools available from server '${serverKey}'`, {
            correlationId,
            operationId: 'enhanced_mcp_server_no_tools',
            serverKey
          });
          continue;
        }

        if (typeof tools !== 'object') {
          appLogger.error(`[Enhanced MCP Tools] ❌ Enhanced MCP client returned invalid tools type for '${serverKey}' - expected object, got ${typeof tools}`, {
            correlationId,
            operationId: 'enhanced_mcp_server_invalid_tools_type',
            serverKey,
            toolsType: typeof tools
          });
          errorServers++;
          continue;
        }

        const toolEntries = Object.entries(tools);
        if (toolEntries.length === 0) {
          appLogger.debug(`[Enhanced MCP Tools] Enhanced MCP client returned empty tools object for '${serverKey}'`, {
            correlationId,
            operationId: 'enhanced_mcp_server_empty_tools',
            serverKey
          });
          continue;
        }

        // Add tools with server prefix (maintains compatibility with existing code)
        let serverToolCount = 0;
        toolEntries.forEach(([toolName, tool]) => {
          if (tool !== null && tool !== undefined) {
            const prefixedToolName = `${serverKey}_${toolName}`;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            combinedTools[prefixedToolName] = tool as Tool<any, any>;
            serverToolCount++;
            totalToolCount++;
          }
        });

        if (serverToolCount > 0) {
          successfulServers++;
          appLogger.info(`[Enhanced MCP Tools] ✅ Loaded ${serverToolCount} tools from Enhanced MCP server '${serverKey}'`, {
            correlationId,
            operationId: 'enhanced_mcp_server_loaded',
            serverKey,
            toolCount: serverToolCount
          });
        }

      } catch (error) {
        errorServers++;
        appLogger.error(`[Enhanced MCP Tools] ❌ Error loading tools from Enhanced MCP server '${serverKey}'`, {
          correlationId,
          operationId: 'enhanced_mcp_server_error',
          serverKey,
          error: error as Error
        });
      }
    }
    
    appLogger.info(`[Enhanced MCP Tools] 🎉 Enhanced MCP tool collection completed: ${totalToolCount} total tools from ${successfulServers}/${serverCount} servers`, {
      correlationId,
      operationId: 'enhanced_mcp_tool_collection_completed',
      totalToolCount,
      successfulServers,
      errorServers,
      serverCount
    });
    
    return combinedTools;
    
  } catch (error) {
    appLogger.error(`[Enhanced MCP Tools] ❌ Critical error during Enhanced MCP tool collection. Returning empty toolset`, {
      correlationId,
      operationId: 'enhanced_mcp_tool_collection_critical_error',
      error: error as Error
    });
    return {}; // Return empty toolset to prevent crashing the chat flow
  }
}

/**
 * Get Enhanced MCP tools from a specific server
 */
export async function getEnhancedMCPToolsFromServer(serverKey: string): Promise<ToolSet> {
  const correlationId = getCurrentCorrelationId();
  
  try {
    const managedClient = mcpServiceRegistry.getService(serverKey);
    if (!managedClient) {
      appLogger.warn(`[Enhanced MCP Tools] Enhanced MCP server '${serverKey}' not found in registry.`, {
        correlationId,
        operationId: 'enhanced_mcp_server_not_found',
        serverKey
      });
      return {};
    }

    const tools = await managedClient.getTools();
    
    if (!tools) {
      appLogger.debug(`[Enhanced MCP Tools] No tools available from Enhanced MCP server '${serverKey}'`, {
        correlationId,
        operationId: 'enhanced_mcp_server_no_tools',
        serverKey
      });
      return {};
    }

    if (typeof tools !== 'object') {
      appLogger.error(`[Enhanced MCP Tools] ❌ Enhanced MCP server '${serverKey}' returned invalid tools type - expected object, got ${typeof tools}`, {
        correlationId,
        operationId: 'enhanced_mcp_server_invalid_tools_type',
        serverKey,
        toolsType: typeof tools
      });
      return {};
    }

    // Return tools with server prefix for consistency
    const prefixedTools: ToolSet = {};
    Object.entries(tools).forEach(([toolName, tool]) => {
      if (tool !== null && tool !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        prefixedTools[`${serverKey}_${toolName}`] = tool as Tool<any, any>;
      }
    });

    appLogger.info(`[Enhanced MCP Tools] ✅ Retrieved ${Object.keys(prefixedTools).length} tools from Enhanced MCP server '${serverKey}'`, {
      correlationId,
      operationId: 'enhanced_mcp_server_tools_retrieved',
      serverKey,
      toolCount: Object.keys(prefixedTools).length
    });

    return prefixedTools;
    
  } catch (error) {
    appLogger.error(`[Enhanced MCP Tools] ❌ Error retrieving tools from Enhanced MCP server '${serverKey}'`, {
      correlationId,
      operationId: 'enhanced_mcp_server_retrieval_error',
      serverKey,
      error: error as Error
    });
    return {};
  }
}

/**
 * Check if a tool exists in Enhanced MCP servers
 */
export async function validateEnhancedMCPToolExists(prefixedToolName: string): Promise<boolean> {
  const parts = prefixedToolName.split('_');
  if (parts.length < 2) {
    return false;
  }
  
  const serverKey = parts[0];
  const toolName = parts.slice(1).join('_');
  
  const managedClient = mcpServiceRegistry.getService(serverKey);
  if (!managedClient) {
    return false;
  }
  
  try {
    const tools = await managedClient.getTools();
    return tools ? Object.prototype.hasOwnProperty.call(tools, toolName) : false;
  } catch (error) {
    appLogger.error(`[Enhanced MCP Tools] Error validating Enhanced MCP tool '${prefixedToolName}'`, {
      correlationId: getCurrentCorrelationId(),
      operationId: 'enhanced_mcp_tool_validation_error',
      prefixedToolName,
      error: error as Error
    });
    return false;
  }
} 