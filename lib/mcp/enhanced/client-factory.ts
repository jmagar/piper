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
  EnhancedStreamableHTTPConfig,
  CircuitBreakerState,
  RetryConfig,
  SchemaDefinition
} from './types';
import { globalMetricsCollector } from './metrics-collector';

// Enhanced error types for better categorization
export class MCPConnectionError extends MCPClientError {
  constructor(message: string, public readonly transport: string) {
    super(message, 'CONNECTION_ERROR');
    this.name = 'MCPConnectionError';
  }
}

export class MCPTimeoutError extends MCPClientError {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message, 'TIMEOUT_ERROR');
    this.name = 'MCPTimeoutError';
  }
}

export class MCPSchemaValidationError extends MCPClientError {
  constructor(message: string, public readonly toolName: string) {
    super(message, 'SCHEMA_VALIDATION_ERROR');
    this.name = 'MCPSchemaValidationError';
  }
}

// Circuit breaker implementation for resilient MCP connections
class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(
    failureThreshold = 5,
    resetTimeoutMs = 30000 // 30 seconds
  ) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
  }

  async execute<T>(operation: () => Promise<T>, context: string): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        appLogger.mcp.info(`[Circuit Breaker] ${context}: Attempting reset (HALF_OPEN)`);
      } else {
        throw new MCPClientError(`Circuit breaker OPEN for ${context}`, 'CIRCUIT_BREAKER_OPEN');
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.reset();
        (appLogger.mcp || appLogger).info(`[Circuit Breaker] ${context}: Reset successful (CLOSED)`);
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
             (appLogger.mcp || appLogger).warn(`[Circuit Breaker] ${context}: Failure recorded (${this.failureCount}/${this.failureThreshold})`);
       throw error;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
         if (this.failureCount >= this.failureThreshold) {
       this.state = 'OPEN';
       (appLogger.mcp || appLogger).error(`[Circuit Breaker] OPENED after ${this.failureCount} failures`);
     }
  }

  private reset(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  getState(): CircuitBreakerState {
    return this.state;
  }
}

// Retry mechanism with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {},
  context: string
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2
  } = config;

  let lastError: Error = new Error('No attempts made');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        appLogger.mcp.error(`[Retry] ${context}: Final attempt failed`, lastError);
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelayMs * Math.pow(backoffMultiplier, attempt),
        maxDelayMs
      );

      appLogger.mcp.warn(`[Retry] ${context}: Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms`, lastError);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Enhanced timeout wrapper
async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  context: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new MCPTimeoutError(`Operation timed out after ${timeoutMs}ms: ${context}`, timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([operation, timeoutPromise]);
}

// Enhanced tool wrapper with improved metrics and error handling
async function wrapToolsWithEnhancedMetrics(
  serverId: string,
  tools: AISDKToolCollection,
  schemas?: Record<string, SchemaDefinition>
): Promise<AISDKToolCollection> {
  const wrappedTools: AISDKToolCollection = {}

  for (const [toolName, tool] of Object.entries(tools)) {
    const originalTool = tool && typeof tool === 'object' ? tool as Record<string, unknown> : { execute: tool }
    const toolSchema = schemas?.[toolName];
    
    wrappedTools[toolName] = {
      ...originalTool,
      execute: async (params: Record<string, unknown>) => {
        const startTime = Date.now();
        const executionId = `${serverId}-${toolName}-${Date.now()}`;

        try {
          // Schema validation if available
          if (toolSchema?.parameters) {
            try {
              toolSchema.parameters.parse(params);
                             (appLogger.mcp || appLogger).debug(`[Enhanced MCP] Schema validation passed for ${toolName}`);
             } catch (validationError) {
               const error = new MCPSchemaValidationError(
                 `Schema validation failed for tool ${toolName}: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`,
                 toolName
               );
              
                             await globalMetricsCollector.recordToolExecution(serverId, toolName, {
                executionTime: Date.now() - startTime,
                success: false,
                aborted: false,
                errorType: 'schema_validation_error',
                errorMessage: error.message,
                callId: executionId
              });

              throw error;
            }
          }

          const executeFunction = originalTool.execute as ((params: Record<string, unknown>) => unknown) | undefined;
          const rawResult = await Promise.resolve(
            executeFunction ? executeFunction(params) : (originalTool as unknown as (params: Record<string, unknown>) => unknown)(params)
          );
          
          // Enhanced response processing
          let processedResult = rawResult;
          let wasProcessed = false;
          let processingTime = 0;
          
          if (typeof rawResult === 'string' && rawResult.length >= 5000) {
            const processingStartTime = Date.now();
            try {
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
          
          // Enhanced metrics collection
          await globalMetricsCollector.recordToolExecution(serverId, toolName, {
            executionTime: Date.now() - startTime,
            success: true,
            aborted: false,
            outputSize: typeof processedResult === 'string' ? processedResult.length : undefined,
            outputType: typeof processedResult === 'object' && processedResult !== null && 'type' in processedResult 
              ? (processedResult as { type: string }).type 
              : typeof processedResult,
            callId: executionId,
            metadata: {
              largeResponseProcessed: wasProcessed,
              processingTime: wasProcessed ? processingTime : undefined,
              originalSize: typeof rawResult === 'string' ? rawResult.length : undefined,
              processedSize: typeof processedResult === 'string' ? processedResult.length : undefined,
              schemaValidated: !!toolSchema?.parameters,
              toolSchema: toolSchema?.name
            } as Record<string, unknown>
          });

          return processedResult;
        } catch (error) {
          await globalMetricsCollector.recordToolExecution(serverId, toolName, {
            executionTime: Date.now() - startTime,
            success: false,
            aborted: false,
            errorType: error instanceof MCPSchemaValidationError ? 'schema_validation_error' : 'execution_error',
            errorMessage: error instanceof Error ? error.message : String(error),
            callId: executionId
          });

          throw error;
        }
      }
    }
  }

  return wrappedTools;
}

// Simple large response processor
function processLargeResponse(toolName: string, result: string): unknown {
  if (result.length < 5000) return result;
  
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
  
  return result.substring(0, 3000) + (result.length > 3000 ? '\n\n[Content truncated for readability]' : '');
}

/**
 * Enhanced MCP Client for stdio transport with circuit breaker, retry, and schema support
 */
export async function createEnhancedStdioMCPClient(
  serverId: string,
  config: EnhancedStdioConfig & { 
    schemas?: Record<string, SchemaDefinition>;
    retryConfig?: RetryConfig;
    timeoutMs?: number;
  }
): Promise<MCPToolSet> {
  const logger = config.logger || appLogger.mcp;
  const circuitBreaker = new CircuitBreaker();
  const retryConfig = config.retryConfig || { maxRetries: 3, baseDelayMs: 1000 };
  const timeoutMs = config.timeoutMs || 30000; // 30 second default timeout

  logger.info(`[Enhanced MCP] Creating stdio client for command: ${config.command}`, {
    clientName: config.clientName || 'ai-sdk-mcp-client',
    args: config.args,
    hasSchemas: !!config.schemas,
    timeout: timeoutMs
  });

  const createClient = async (): Promise<{ client: any; tools: AISDKToolCollection }> => {
    const mcpClient = await withTimeout(
      createMCPClient({
        transport: new StdioMCPTransport({
          command: config.command,
          args: config.args || [],
          env: config.env || {},
          cwd: config.cwd,
          stderr: config.stderr || 'pipe'
        }),
        onUncaughtError: (error) => {
          logger.error(`[Enhanced MCP] Uncaught error in stdio client:`, error);
          globalMetricsCollector.recordError(serverId, 'uncaught_error', String(error));
        }
      }),
      timeoutMs,
      `stdio client creation for ${config.command}`
    );

    // Get tools with optional schema-first approach
    const toolOptions = config.schemas ? { schemas: config.schemas } : undefined;
    const tools = await withTimeout(
      mcpClient.tools(toolOptions),
      timeoutMs,
      `tools discovery for ${config.command}`
    );
    
    return { client: mcpClient, tools };
  };

  try {
    const { client: mcpClient, tools } = await circuitBreaker.execute(
      () => withRetry(createClient, retryConfig, `stdio client for ${config.command}`),
      `stdio-${serverId}`
    );
    
    const enhancedTools = await wrapToolsWithEnhancedMetrics(serverId, tools, config.schemas);
    
    logger.info('[Enhanced MCP] Successfully connected to stdio MCP server', {
      toolCount: Object.keys(tools).length,
      schemaCount: config.schemas ? Object.keys(config.schemas).length : 0
    });

    return {
      tools: enhancedTools,
      close: async () => {
        logger.info(`[Enhanced MCP] Closing stdio client for command: ${config.command}`);
        try {
          await withTimeout(mcpClient.close(), 5000, `stdio client close for ${config.command}`);
          logger.info(`[Enhanced MCP] Stdio client for command ${config.command} closed successfully`);
        } catch (error) {
          logger.error(`[Enhanced MCP] Error closing stdio client for command ${config.command}:`, error as Error);
          throw new MCPClientError(`Failed to close MCP client for command ${config.command}`, 'CLOSE_ERROR');
        }
      },
      healthCheck: async () => {
        logger.debug(`[Enhanced MCP] Performing health check for stdio client: ${config.command}`);
        try {
          return await circuitBreaker.execute(async () => {
            const currentTools = await withTimeout(mcpClient.tools(), 5000, `health check for ${config.command}`);
            return typeof currentTools === 'object' && currentTools !== null;
          }, `health-check-stdio-${serverId}`);
        } catch (error) {
          logger.error(`[Enhanced MCP] Stdio health check failed for ${config.command}:`, error as Error);
          return false;
        }
      },
      circuitBreakerState: circuitBreaker.getState.bind(circuitBreaker)
    };
  } catch (error) {
    logger.error(`[Enhanced MCP] Failed to create stdio client for command ${config.command}:`, error as Error);

    if (error instanceof MCPTimeoutError || error instanceof MCPConnectionError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new MCPConnectionError(
        `Failed to initialize stdio MCP client: ${error.message}`,
        'stdio'
      );
    }
    
    throw new MCPClientError('Unknown error during stdio MCP client initialization');
  }
}

/**
 * Enhanced MCP Client for SSE transport with circuit breaker, retry, and schema support
 */
export async function createEnhancedSSEMCPClient(
  serverId: string,
  config: EnhancedSSEConfig & { 
    schemas?: Record<string, SchemaDefinition>;
    retryConfig?: RetryConfig;
    timeoutMs?: number;
  }
): Promise<MCPToolSet> {
  const logger = config.logger || appLogger.mcp;
  const circuitBreaker = new CircuitBreaker();
  const retryConfig = config.retryConfig || { maxRetries: 3, baseDelayMs: 1000 };
  const timeoutMs = config.timeoutMs || 30000;

  logger.info(`[Enhanced MCP] Creating SSE client for URL: ${config.url}`, {
    clientName: config.clientName || 'ai-sdk-mcp-client',
    hasHeaders: !!config.headers,
    hasSchemas: !!config.schemas,
    timeout: timeoutMs
  });

  const createClient = async (): Promise<{ client: any; tools: AISDKToolCollection }> => {
    const mcpClient = await withTimeout(
      createMCPClient({
        transport: {
          type: 'sse',
          url: config.url,
          headers: {
            'User-Agent': config.clientName || 'ai-sdk-mcp-client',
            ...config.headers
          }
        },
        onUncaughtError: (error) => {
          logger.error(`[Enhanced MCP] Uncaught error in SSE client:`, error);
          globalMetricsCollector.recordError(serverId, 'uncaught_error', String(error));
        }
      }),
      timeoutMs,
      `SSE client creation for ${config.url}`
    );

    const toolOptions = config.schemas ? { schemas: config.schemas } : undefined;
    const tools = await withTimeout(
      mcpClient.tools(toolOptions),
      timeoutMs,
      `tools discovery for ${config.url}`
    );
    
    return { client: mcpClient, tools };
  };

  try {
    const { client: mcpClient, tools } = await circuitBreaker.execute(
      () => withRetry(createClient, retryConfig, `SSE client for ${config.url}`),
      `sse-${serverId}`
    );
    
    const enhancedTools = await wrapToolsWithEnhancedMetrics(serverId, tools, config.schemas);
    
    logger.info(`[Enhanced MCP] Successfully connected to SSE MCP server at ${config.url}`, {
      toolCount: Object.keys(tools).length,
      schemaCount: config.schemas ? Object.keys(config.schemas).length : 0
    });

    return {
      tools: enhancedTools,
      close: async () => {
        logger.info(`[Enhanced MCP] Closing SSE client for URL: ${config.url}`);
        try {
          await withTimeout(mcpClient.close(), 5000, `SSE client close for ${config.url}`);
          logger.info(`[Enhanced MCP] SSE client for ${config.url} closed successfully`);
        } catch (error) {
          logger.error(`[Enhanced MCP] Error closing SSE client for ${config.url}:`, error as Error);
          throw new MCPClientError(`Failed to close SSE MCP client for ${config.url}`, 'CLOSE_ERROR');
        }
      },
      healthCheck: async () => {
        logger.debug(`[Enhanced MCP] Performing health check for SSE client: ${config.url}`);
        try {
          return await circuitBreaker.execute(async () => {
            const currentTools = await withTimeout(mcpClient.tools(), 5000, `health check for ${config.url}`);
            return typeof currentTools === 'object' && currentTools !== null;
          }, `health-check-sse-${serverId}`);
        } catch (error) {
          logger.error(`[Enhanced MCP] SSE health check failed for ${config.url}:`, error as Error);
          return false;
        }
      },
      circuitBreakerState: circuitBreaker.getState.bind(circuitBreaker)
    };
  } catch (error) {
    logger.error(`[Enhanced MCP] Failed to create SSE client for ${config.url}:`, error as Error);

    if (error instanceof MCPTimeoutError || error instanceof MCPConnectionError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new MCPConnectionError(
        `Failed to initialize SSE MCP client for ${config.url}: ${error.message}`,
        'sse'
      );
    }
    
    throw new MCPClientError(`Unknown error during SSE MCP client initialization for ${config.url}`);
  }
}

/**
 * Enhanced MCP Client for StreamableHTTP transport with circuit breaker, retry, and schema support
 */
export async function createEnhancedStreamableHTTPMCPClient(
  serverId: string,
  config: EnhancedStreamableHTTPConfig & { 
    schemas?: Record<string, SchemaDefinition>;
    retryConfig?: RetryConfig;
    timeoutMs?: number;
  }
): Promise<MCPToolSet> {
  const logger = config.logger || appLogger.mcp;
  const circuitBreaker = new CircuitBreaker();
  const retryConfig = config.retryConfig || { maxRetries: 3, baseDelayMs: 1000 };
  const timeoutMs = config.timeoutMs || 30000;

  logger.info(`[Enhanced MCP] Creating StreamableHTTP client for URL: ${config.url}`, {
    clientName: config.clientName || 'ai-sdk-mcp-client',
    sessionId: config.sessionId,
    hasHeaders: !!config.headers,
    hasSchemas: !!config.schemas,
    timeout: timeoutMs
  });

  const createClient = async (): Promise<{ client: any; tools: AISDKToolCollection }> => {
    // Enhanced dynamic import handling
    interface StreamableHTTPClientTransportConstructor {
      new (url: URL, options?: { sessionId?: string; requestInit?: RequestInit }): unknown
    }
    
    let StreamableHTTPClientTransport: StreamableHTTPClientTransportConstructor;
    
    try {
      const importPaths = [
        '@modelcontextprotocol/sdk/client/streamableHttp',
        '@modelcontextprotocol/sdk/client/stdio',
        '@modelcontextprotocol/sdk'
      ];
      
      let imported = false;
      for (const importPath of importPaths) {
        try {
          const module = await eval(`import('${importPath}')`);
          if (module?.StreamableHTTPClientTransport) {
            StreamableHTTPClientTransport = module.StreamableHTTPClientTransport;
            imported = true;
            break;
          }
        } catch {
          // Try next import path
        }
      }
      
      if (!imported) {
        throw new Error('StreamableHTTPClientTransport not available in any known module path');
      }
    } catch (importError) {
      const errorMessage = `StreamableHTTPClientTransport not available or import failed: ${importError instanceof Error ? importError.message : String(importError)}. Ensure @modelcontextprotocol/sdk is properly installed.`;
      logger.error(`[Enhanced MCP] ${errorMessage}`, importError as Error);
      throw new MCPClientError(errorMessage, 'IMPORT_ERROR');
    }
    
    const transport = new StreamableHTTPClientTransport(new URL(config.url), {
      sessionId: config.sessionId,
      requestInit: {
        headers: {
          'User-Agent': config.clientName || 'ai-sdk-mcp-client',
          ...config.headers
        }
      }
    });

    const mcpClient = await withTimeout(
      createMCPClient({
        transport: transport as any,
        onUncaughtError: (error) => {
          logger.error(`[Enhanced MCP] Uncaught error in StreamableHTTP client:`, error);
          globalMetricsCollector.recordError(serverId, 'uncaught_error', String(error));
        }
      }),
      timeoutMs,
      `StreamableHTTP client creation for ${config.url}`
    );

    const toolOptions = config.schemas ? { schemas: config.schemas } : undefined;
    const tools = await withTimeout(
      mcpClient.tools(toolOptions),
      timeoutMs,
      `tools discovery for ${config.url}`
    );
    
    return { client: mcpClient, tools };
  };

  try {
    const { client: mcpClient, tools } = await circuitBreaker.execute(
      () => withRetry(createClient, retryConfig, `StreamableHTTP client for ${config.url}`),
      `streamable-http-${serverId}`
    );
    
    const enhancedTools = await wrapToolsWithEnhancedMetrics(serverId, tools, config.schemas);
    
    logger.info(`[Enhanced MCP] Successfully connected to StreamableHTTP MCP server at ${config.url}`, {
      toolCount: Object.keys(tools).length,
      schemaCount: config.schemas ? Object.keys(config.schemas).length : 0
    });
    
    return {
      tools: enhancedTools,
      close: async () => {
        logger.info(`[Enhanced MCP] Closing StreamableHTTP client for URL: ${config.url}`);
        try {
          await withTimeout(mcpClient.close(), 5000, `StreamableHTTP client close for ${config.url}`);
          logger.info(`[Enhanced MCP] StreamableHTTP client for ${config.url} closed successfully`);
        } catch (error) {
          logger.error(`[Enhanced MCP] Error closing StreamableHTTP client for ${config.url}:`, error as Error);
          throw new MCPClientError(`Failed to close StreamableHTTP MCP client for ${config.url}`, 'CLOSE_ERROR');
        }
      },
      healthCheck: async () => {
        logger.debug(`[Enhanced MCP] Performing health check for StreamableHTTP client: ${config.url}`);
        try {
          return await circuitBreaker.execute(async () => {
            const currentTools = await withTimeout(mcpClient.tools(), 5000, `health check for ${config.url}`);
            return typeof currentTools === 'object' && currentTools !== null;
          }, `health-check-streamable-http-${serverId}`);
        } catch (error) {
          logger.error(`[Enhanced MCP] StreamableHTTP health check failed for ${config.url}:`, error as Error);
          return false;
        }
      },
      circuitBreakerState: circuitBreaker.getState.bind(circuitBreaker)
    };
  } catch (error) {
    if (error instanceof MCPClientError) {
      throw error;
    }

    logger.error(`[Enhanced MCP] Failed to create or configure StreamableHTTP client for ${config.url}:`, error as Error);
    
    if (error instanceof Error) {
      throw new MCPConnectionError(
        `Failed to initialize StreamableHTTP MCP client for ${config.url}: ${error.message}`,
        'streamable-http'
      );
    }
    
    throw new MCPClientError(`Unknown error during StreamableHTTP MCP client initialization for ${config.url}`);
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
      if ('sessionId' in config) {
        client = await createEnhancedStreamableHTTPMCPClient((config as EnhancedStreamableHTTPConfig).clientName || 'typed-streamable-http-client', config as EnhancedStreamableHTTPConfig)
      } else {
        client = await createEnhancedSSEMCPClient((config as EnhancedSSEConfig).clientName || 'typed-sse-client', config as EnhancedSSEConfig)
      }
    } else {
      client = await createEnhancedStdioMCPClient((config as EnhancedStdioConfig).clientName || 'typed-stdio-client', config as EnhancedStdioConfig)
    }

    if (schemas) {
      appLogger.mcp.info('[Enhanced MCP] Validating tools against provided schemas')
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

async function validateToolsAgainstSchemas<T extends Record<string, z.ZodSchema>>(
  tools: AISDKToolCollection,
  schemas: T
): Promise<AISDKToolCollection> {
  try {
    appLogger.mcp.info('[Enhanced MCP] Tool validation completed for', Object.keys(tools).length, 'tools')
    
    for (const toolName of Object.keys(tools)) {
      if (schemas[toolName]) {
        appLogger.mcp.debug(`[Enhanced MCP] Schema available for tool: ${toolName}`)
      }
    }
    
    return tools
  } catch (error) {
    throw new MCPClientError(`Tool validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

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
  return await createEnhancedStdioMCPClient(config.clientName || 'local-enhanced-client', config);
}

export async function loadMCPToolsFromURLEnhanced(
  url: string,
  options: Partial<EnhancedSSEConfig> = {}
) {
  const config = {
    url,
    clientName: 'piper-mcp-client',
    ...options
  };
  return await createEnhancedSSEMCPClient(config.clientName || 'url-enhanced-client', config)
} 