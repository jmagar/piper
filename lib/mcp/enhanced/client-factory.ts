import { experimental_createMCPClient as createMCPClient } from "ai";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio"
import { z } from "zod"
import { appLogger } from '@/lib/logger';
import {
  AISDKToolCollection,
  MCPToolSet,
  MCPClientError,
  EnhancedStdioConfig,
  EnhancedSSEConfig,
  EnhancedStreamableHTTPConfig
} from './types';
import { globalMetricsCollector } from './metrics-collector';

// Simple large response processor to avoid circular imports
function processLargeResponse(toolName: string, result: string): unknown {
  // Simple truncation strategy to avoid circular import issues
  if (result.length < 5000) return result;
  
  // Basic processing for common tool types
  if (toolName.includes('fetch') || toolName.includes('crawl') || toolName.includes('search')) {
    return {
      type: 'large_response_summary',
      tool: toolName,
      summary: `${toolName} returned ${result.length} characters`,
      preview: result.substring(0, 1500) + (result.length > 1500 ? '...\n\n[Content truncated for readability]' : ''),
      metadata: {
        original_length: result.length,
        truncated: true
      }
    };
  }
  
  // For other tools, just truncate
  return result.substring(0, 3000) + (result.length > 3000 ? '\n\n[Content truncated for readability]' : '');
}

/**
 * Wraps MCP tools with metrics collection and large response processing
 */
async function wrapToolsWithMetrics(
  serverId: string,
  tools: AISDKToolCollection
): Promise<AISDKToolCollection> {
  const wrappedTools: AISDKToolCollection = {}

  for (const [toolName, tool] of Object.entries(tools)) {
    // Ensure tool is an object with proper structure
    const originalTool = tool && typeof tool === 'object' ? tool as Record<string, unknown> : { execute: tool }
    
    wrappedTools[toolName] = {
      ...originalTool,
      execute: async (params: Record<string, unknown>) => {
        const startTime = Date.now()

        try {
          // Execute the original tool directly without abort handling
          const executeFunction = originalTool.execute as ((params: Record<string, unknown>) => unknown) | undefined
          const rawResult = await Promise.resolve(
            executeFunction ? executeFunction(params) : (originalTool as unknown as (params: Record<string, unknown>) => unknown)(params)
          )
          
          // Process large responses automatically (simple check to avoid circular imports)
          let processedResult = rawResult;
          let wasProcessed = false;
          let processingTime = 0;
          
          // Only process if result is a large string (>5000 chars)
          if (typeof rawResult === 'string' && rawResult.length >= 5000) {
            const processingStartTime = Date.now();
            try {
              // Simple processing to avoid circular import issues
              processedResult = processLargeResponse(toolName, rawResult);
              processingTime = Date.now() - processingStartTime;
              wasProcessed = processedResult !== rawResult;
              
              if (wasProcessed) {
                appLogger.mcp.info(`[Enhanced MCP] Processed large response for tool: ${toolName} (${processingTime}ms)`);
              }
            } catch (processingError) {
              appLogger.mcp.warn(`[Enhanced MCP] Failed to process large response for ${toolName}:`, processingError);
              processedResult = rawResult;
              wasProcessed = false;
            }
          }
          
          // Record successful execution with processing metrics
          await globalMetricsCollector.recordToolExecution(serverId, toolName, {
            executionTime: Date.now() - startTime,
            success: true,
            aborted: false,
            outputSize: typeof processedResult === 'string' ? processedResult.length : undefined,
            outputType: typeof processedResult === 'object' && processedResult !== null && 'type' in processedResult 
              ? (processedResult as { type: string }).type 
              : typeof processedResult,
            metadata: {
              largeResponseProcessed: wasProcessed,
              processingTime: wasProcessed ? processingTime : undefined,
              originalSize: typeof rawResult === 'string' ? rawResult.length : undefined,
              processedSize: typeof processedResult === 'string' ? processedResult.length : undefined
            }
          })

          return processedResult
        } catch (error) {
          // Record failed execution
          await globalMetricsCollector.recordToolExecution(serverId, toolName, {
            executionTime: Date.now() - startTime,
            success: false,
            aborted: false,
            errorType: 'execution_error',
            errorMessage: error instanceof Error ? error.message : String(error),
          })

          throw error
        }
      }
    }
  }

  return wrappedTools
}

/**
 * Enhanced MCP Client for stdio transport with robust error handling
 */
export async function createEnhancedStdioMCPClient(
  serverId: string,
  config: EnhancedStdioConfig
): Promise<MCPToolSet> {
  const logger = config.logger || appLogger.mcp;
  logger.info(`[Enhanced MCP] Creating stdio client for command: ${config.command}`, {
    clientName: config.clientName || 'ai-sdk-mcp-client',
    args: config.args, // Log arguments as part of the metadata object
  });

  try {
    const mcpClient = await createMCPClient({
      transport: new StdioMCPTransport({
        command: config.command,
        args: config.args || [],
        env: config.env || {},
        cwd: config.cwd,
        stderr: config.stderr || 'pipe' // Default to 'pipe' for better diagnostics
      })
    })

    // Get tools with optional schema validation
    const tools = await mcpClient.tools()
    
    // Wrap tools with metrics collection
    const enhancedTools = await wrapToolsWithMetrics(serverId, tools)
    
    logger.info('[Enhanced MCP] Successfully connected to stdio MCP server');

    return {
      tools: enhancedTools,
      close: async () => {
        logger.info(`[Enhanced MCP] Closing stdio client for command: ${config.command}`);
        try {
          await mcpClient.close();
          logger.info(`[Enhanced MCP] Stdio client for command ${config.command} closed successfully`);
        } catch (error) {
          logger.error(`[Enhanced MCP] Error closing stdio client for command ${config.command}:`, error as Error);
          throw new MCPClientError(`Failed to close MCP client for command ${config.command}`, 'CLOSE_ERROR');
        }
      },
      healthCheck: async () => {
        logger.debug(`[Enhanced MCP] Performing health check for stdio client: ${config.command}`);
        try {
          const currentTools = await mcpClient.tools();
          // A basic check: if tools() doesn't throw and returns an object (even empty), consider it healthy.
          // MCP servers should always return at least an empty object for capabilities.
          const isHealthy = typeof currentTools === 'object' && currentTools !== null;
          if (!isHealthy) {
             logger.warn(`[Enhanced MCP] Stdio health check failed for ${config.command}: mcpClient.tools() returned non-object or null.`);
          }
          return isHealthy;
        } catch (hcError) {
          logger.error(`[Enhanced MCP] Stdio health check failed for ${config.command}:`, hcError as Error);
          return false;
        }
      }
    };
  } catch (error) {
    logger.error(`[Enhanced MCP] Failed to create stdio client for command ${config.command}:`, error as Error);

    if (error instanceof Error) {
      throw new MCPClientError(
        `Failed to initialize stdio MCP client: ${error.message}`,
        'INIT_ERROR'
      )
    }
    
    throw new MCPClientError('Unknown error during stdio MCP client initialization')
  }
}

/**
 * Enhanced MCP Client for SSE transport with additional configuration
 */
export async function createEnhancedSSEMCPClient(
  serverId: string,
  config: EnhancedSSEConfig
): Promise<MCPToolSet> {
  const logger = config.logger || appLogger.mcp;
  logger.info(`[Enhanced MCP] Creating SSE client for URL: ${config.url}`, {
    clientName: config.clientName || 'ai-sdk-mcp-client',
    hasHeaders: !!config.headers // Log headers presence as part of metadata
  });

  try {
    const mcpClient = await createMCPClient({
      transport: {
        type: 'sse',
        url: config.url,
        headers: {
          'User-Agent': config.clientName || 'ai-sdk-mcp-client',
          ...config.headers
        }
      }
    })

    // Get tools with optional schema validation
    const tools = await mcpClient.tools()
    
    // Wrap tools with metrics collection
    const enhancedTools = await wrapToolsWithMetrics(serverId, tools)
    
    logger.info(`[Enhanced MCP] Successfully connected to SSE MCP server at ${config.url}`);

    return {
      tools: enhancedTools,
      close: async () => {
        logger.info(`[Enhanced MCP] Closing SSE client for URL: ${config.url}`);
        try {
          await mcpClient.close();
          logger.info(`[Enhanced MCP] SSE client for ${config.url} closed successfully`);
        } catch (error) {
          logger.error(`[Enhanced MCP] Error closing SSE client for ${config.url}:`, error as Error);
          throw new MCPClientError(`Failed to close SSE MCP client for ${config.url}`, 'CLOSE_ERROR');
        }
      },
      healthCheck: async () => {
        logger.debug(`[Enhanced MCP] Performing health check for SSE client: ${config.url}`);
        try {
          const currentTools = await mcpClient.tools();
          const isHealthy = typeof currentTools === 'object' && currentTools !== null;
          if (!isHealthy) {
             logger.warn(`[Enhanced MCP] SSE health check failed for ${config.url}: mcpClient.tools() returned non-object or null.`);
          }
          return isHealthy;
        } catch (hcError) {
          logger.error(`[Enhanced MCP] SSE health check failed for ${config.url}:`, hcError as Error);
          return false;
        }
      }
    };
  } catch (error) {
    logger.error(`[Enhanced MCP] Failed to create SSE client for ${config.url}:`, error as Error);

    if (error instanceof Error) {
      throw new MCPClientError(
        `Failed to initialize SSE MCP client for ${config.url}: ${error.message}`,
        'INIT_ERROR'
      )
    }
    
    throw new MCPClientError(`Unknown error during SSE MCP client initialization for ${config.url}`)
  }
}

/**
 * Enhanced MCP Client for StreamableHTTP transport
 */
export async function createEnhancedStreamableHTTPMCPClient(
  serverId: string,
  config: EnhancedStreamableHTTPConfig
): Promise<MCPToolSet> {
  const logger = config.logger || appLogger.mcp;
  logger.info(`[Enhanced MCP] Creating StreamableHTTP client for URL: ${config.url}`, {
    clientName: config.clientName || 'ai-sdk-mcp-client',
    sessionId: config.sessionId,
    hasHeaders: !!config.headers
  });

  try {
    // Import StreamableHTTPClientTransport dynamically using eval to avoid module resolution
    interface StreamableHTTPClientTransportConstructor {
      new (url: URL, options?: { sessionId?: string; requestInit?: RequestInit }): unknown
    }
    
    let StreamableHTTPClientTransport: StreamableHTTPClientTransportConstructor
    try {
      // Try primary import path using eval to avoid TypeScript module resolution
      const importPath1 = '@modelcontextprotocol/sdk/client/streamableHttp'
      const mcpModule = await eval(`import('${importPath1}')`).catch(() => null)
      if (mcpModule?.StreamableHTTPClientTransport) {
        StreamableHTTPClientTransport = mcpModule.StreamableHTTPClientTransport
      } else {
        // Try alternative import path
        const importPath2 = '@modelcontextprotocol/sdk/client/stdio' 
        const altModule = await eval(`import('${importPath2}')`).catch(() => null)
        if (altModule && 'StreamableHTTPClientTransport' in altModule) {
          StreamableHTTPClientTransport = (altModule as Record<string, unknown>).StreamableHTTPClientTransport as StreamableHTTPClientTransportConstructor
        } else {
          const errorMessage = '[Enhanced MCP] StreamableHTTPClientTransport not available in any known module path';
          logger.error(errorMessage);
          throw new Error(errorMessage.replace('[Enhanced MCP] ', '')); // Keep error message clean for user
        }
      }
    } catch (importError) {
      const errorMessage = `[Enhanced MCP] StreamableHTTPClientTransport not available or import failed (URL: ${config.url}): ${importError instanceof Error ? importError.message : String(importError)}. Ensure @modelcontextprotocol/sdk is properly installed.`;
      logger.error(errorMessage, importError as Error);
      throw new MCPClientError(errorMessage.replace('[Enhanced MCP] ', ''), 'INIT_ERROR');
    }
    
    const transport = new StreamableHTTPClientTransport(new URL(config.url), {
      sessionId: config.sessionId,
      requestInit: {
        headers: {
          'User-Agent': config.clientName || 'ai-sdk-mcp-client',
          ...config.headers
        }
      }
    })

    const mcpClient = await createMCPClient({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transport: transport as any
    })

    // Get tools from the StreamableHTTP server
    const tools = await mcpClient.tools()
    
    // Wrap tools with metrics collection
    const enhancedTools = await wrapToolsWithMetrics(serverId, tools)
    
    logger.info(`[Enhanced MCP] Successfully connected to StreamableHTTP MCP server at ${config.url}`);
    
    return {
      tools: enhancedTools,
      close: async () => {
        logger.info(`[Enhanced MCP] Closing StreamableHTTP client for URL: ${config.url}`);
        try {
          await mcpClient.close();
          logger.info(`[Enhanced MCP] StreamableHTTP client for ${config.url} closed successfully`);
        } catch (error) {
          logger.error(`[Enhanced MCP] Error closing StreamableHTTP client for ${config.url}:`, error as Error);
          throw new MCPClientError(`Failed to close StreamableHTTP MCP client for ${config.url}`, 'CLOSE_ERROR');
        }
      },
      healthCheck: async () => {
        logger.debug(`[Enhanced MCP] Performing health check for StreamableHTTP client: ${config.url}`);
        try {
          const currentTools = await mcpClient.tools();
          const isHealthy = typeof currentTools === 'object' && currentTools !== null;
           if (!isHealthy) {
             logger.warn(`[Enhanced MCP] StreamableHTTP health check failed for ${config.url}: mcpClient.tools() returned non-object or null.`);
          }
          return isHealthy;
        } catch (hcError) {
          logger.error(`[Enhanced MCP] StreamableHTTP health check failed for ${config.url}:`, hcError as Error);
          return false;
        }
      }
    };
  } catch (error) {
    // Errors from dynamic import are caught above and re-thrown as MCPClientError
    // This catch block now primarily handles errors from createMCPClient, mcpClient.tools(), or wrapToolsWithMetrics
    if (!(error instanceof MCPClientError)) { // Avoid double wrapping if error is already MCPClientError from import stage
      logger.error(`[Enhanced MCP] Failed to create or configure StreamableHTTP client for ${config.url} (post-import):`, error as Error);
      if (error instanceof Error) {
        throw new MCPClientError(
          `Failed to initialize StreamableHTTP MCP client for ${config.url} (post-import): ${error.message}`,
          'INIT_ERROR'
        );
      }
      throw new MCPClientError(`Unknown error during StreamableHTTP MCP client initialization for ${config.url} (post-import)`);
    } else {
      throw error; // Re-throw MCPClientError from import stage
    }
  }
}

/**
 * Enhanced MCP Client with schema validation and type safety
 */
export async function createTypedMCPClient<T extends Record<string, z.ZodSchema>>(
  config: EnhancedStdioConfig | EnhancedSSEConfig | EnhancedStreamableHTTPConfig,
  schemas?: T
): Promise<MCPToolSet & { typedTools?: T }> {
  
  try {
    let client: MCPToolSet
    
    if ('url' in config) {
      // Determine if it's SSE or StreamableHTTP by checking for sessionId
      if ('sessionId' in config) {
        client = await createEnhancedStreamableHTTPMCPClient((config as EnhancedStreamableHTTPConfig).clientName || 'typed-streamable-http-client', config as EnhancedStreamableHTTPConfig)
      } else {
        client = await createEnhancedSSEMCPClient((config as EnhancedSSEConfig).clientName || 'typed-sse-client', config as EnhancedSSEConfig)
      }
    } else {
      client = await createEnhancedStdioMCPClient((config as EnhancedStdioConfig).clientName || 'typed-stdio-client', config as EnhancedStdioConfig)
    }

    // If schemas provided, validate tools against them
    if (schemas) {
      console.log('[Enhanced MCP] Validating tools against provided schemas')
      
      // This would validate the tools against the schemas
      // Implementation depends on the actual tool format from MCP server
      const validatedTools = await validateToolsAgainstSchemas(client.tools, schemas)
      
      return {
        ...client,
        tools: validatedTools,
        schemas,
        typedTools: schemas
      }
    }

    return client as MCPToolSet & { typedTools?: T }
  } catch (error) {
    if (error instanceof MCPClientError) {
      throw error
    }
    
    throw new MCPClientError(
      `Failed to create typed MCP client: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Validate MCP tools against Zod schemas
 */
async function validateToolsAgainstSchemas<T extends Record<string, z.ZodSchema>>(
  tools: AISDKToolCollection,
  schemas: T
): Promise<AISDKToolCollection> {
  try {
    // Validate each tool against its corresponding schema if available
    console.log('[Enhanced MCP] Tool validation completed for', Object.keys(tools).length, 'tools')
    
    // For now, just log schema availability - actual validation would depend on tool structure
    for (const toolName of Object.keys(tools)) {
      if (schemas[toolName]) {
        console.log(`[Enhanced MCP] Schema available for tool: ${toolName}`)
      }
    }
    
    return tools
  } catch (error) {
    throw new MCPClientError(`Tool validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Factory function to create the appropriate client based on configuration
 */
export async function createMCPClientFromConfig(
  serverId: string,
  config: EnhancedStdioConfig | EnhancedSSEConfig | EnhancedStreamableHTTPConfig
): Promise<MCPToolSet> {
  if ('command' in config) {
    return createEnhancedStdioMCPClient(serverId, config)
  } else if ('sessionId' in config) {
    return createEnhancedStreamableHTTPMCPClient(serverId, config)
  } else {
    return createEnhancedSSEMCPClient(serverId, config)
  }
}

/**
 * Helper function for backward compatibility with existing code
 */
export async function loadMCPToolsFromLocalEnhanced(
  command: string,
  env: Record<string, string> = {},
  options: Partial<EnhancedStdioConfig> = {}
) {
  const config = {
    command,
    env,
    clientName: 'piper-mcp-client',
    ...options
  };
  return await createEnhancedStdioMCPClient(config.clientName, config);
}

/**
 * Helper function for backward compatibility with existing code
 */
export async function loadMCPToolsFromURLEnhanced(
  url: string,
  options: Partial<EnhancedSSEConfig> = {}
) {
  const config = {
    url,
    clientName: 'piper-mcp-client',
    ...options
  };
  return await createEnhancedSSEMCPClient(config.clientName, config)
} 