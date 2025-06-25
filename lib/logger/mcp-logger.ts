import { appLogger } from './index';
import { getCurrentCorrelationId, getCurrentContext } from './correlation';
import { McpLogEntry, McpOperation, ErrorCategory } from './types';
import { errorHandler } from './error-handler';

// MCP Protocol version constants
export const MCP_PROTOCOL_VERSIONS = ['2024-11-05', '2025-03-26'] as const;
export type McpProtocolVersion = typeof MCP_PROTOCOL_VERSIONS[number];

// JSON-RPC error codes as defined in the MCP specification
export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32000, // Server error range: -32000 to -32099
} as const;

// MCP-specific error messages
export const MCP_ERROR_MESSAGES = {
  [MCP_ERROR_CODES.PARSE_ERROR]: 'Parse error',
  [MCP_ERROR_CODES.INVALID_REQUEST]: 'Invalid Request',
  [MCP_ERROR_CODES.METHOD_NOT_FOUND]: 'Method not found',
  [MCP_ERROR_CODES.INVALID_PARAMS]: 'Invalid params',
  [MCP_ERROR_CODES.INTERNAL_ERROR]: 'Internal error',
  [MCP_ERROR_CODES.SERVER_ERROR]: 'Server error',
} as const;

// JSON-RPC message types
export enum JsonRpcMessageType {
  REQUEST = 'request',
  RESPONSE = 'response',
  NOTIFICATION = 'notification',
  ERROR = 'error',
}

// MCP transport types
export enum McpTransportType {
  STDIO = 'stdio',
  HTTP = 'http',
  SSE = 'sse',
}

// Interfaces for MCP logging
export interface JsonRpcMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface McpServerInfo {
  serverId: string;
  name: string;
  version: string;
  protocolVersion: McpProtocolVersion;
  capabilities?: string[];
  transport: McpTransportType;
  status: 'initializing' | 'ready' | 'error' | 'shutdown';
}

export interface McpToolExecution {
  toolName: string;
  serverId: string;
  requestId: string | number;
  parameters?: Record<string, unknown>;
  result?: unknown;
  error?: Error;
  startTime: number;
  endTime?: number;
  duration?: number;
}

export interface McpResourceAccess {
  resourceUri: string;
  serverId: string;
  requestId: string | number;
  mimeType?: string;
  size?: number;
  cached?: boolean;
  startTime: number;
  endTime?: number;
  duration?: number;
}

/**
 * MCP-specific logger class
 */
export class McpLogger {
  private static instance: McpLogger;
  private serverRegistry: Map<string, McpServerInfo> = new Map();
  private activeExecutions: Map<string, McpToolExecution> = new Map();
  private performanceMetrics: Map<string, number[]> = new Map();

  private constructor() {}

  public static getInstance(): McpLogger {
    if (!McpLogger.instance) {
      McpLogger.instance = new McpLogger();
    }
    return McpLogger.instance;
  }

  /**
   * Log JSON-RPC message
   */
  public logJsonRpcMessage(
    message: JsonRpcMessage,
    messageType: JsonRpcMessageType,
    serverId?: string,
    transport?: McpTransportType
  ): void {
    const correlationId = getCurrentCorrelationId();
    const context = getCurrentContext();

    const logData: Partial<McpLogEntry> = {
      operation: this.getOperationFromMethod(message.method),
      serverId,
      jsonRpcId: message.id,
      protocolVersion: '2024-11-05', // Default version
      metadata: {
        messageType,
        transport,
        method: message.method,
        hasParams: !!message.params,
        hasResult: !!message.result,
        hasError: !!message.error,
      },
    };

    // Sanitize sensitive data from params
    if (message.params) {
      logData.metadata!.params = this.sanitizeParams(message.params);
    }

    // Log error details if present
    if (message.error) {
      const errorLevel = this.getErrorSeverity(message.error.code);
      
      // Create a proper Error object for the logger
      const error = this.createMcpError(
        message.error.code,
        message.error.message,
        message.error.data
      );
      
      appLogger.mcp?.[errorLevel]('JSON-RPC error message', error as Error & Record<string, unknown>, {
        ...logData,
        correlationId,
        userId: context?.userId,
      });
    } else {
      appLogger.mcp?.debug('JSON-RPC message', {
        ...logData,
        correlationId,
        userId: context?.userId,
      });
    }
  }

  /**
   * Log server lifecycle events
   */
  public logServerLifecycle(
    operation: McpOperation,
    serverId: string,
    details: {
      serverInfo?: Partial<McpServerInfo>;
      capabilities?: string[];
      protocolVersion?: McpProtocolVersion;
      error?: Error;
      metadata?: Record<string, unknown>;
    } = {}
  ): void {
    const correlationId = getCurrentCorrelationId();
    const context = getCurrentContext();
    const transport = (details.serverInfo as { transport?: { type?: McpTransportType; info?: unknown; httpSettings?: unknown } })?.transport;

    // Update server registry
    if (details.serverInfo && operation === McpOperation.SERVER_STARTUP) {
      this.serverRegistry.set(serverId, {
        serverId,
        name: details.serverInfo.name || 'Unknown',
        version: details.serverInfo.version || '1.0.0',
        protocolVersion: details.protocolVersion || '2024-11-05',
        capabilities: details.capabilities,
        transport: transport?.type || McpTransportType.STDIO,
        status: 'initializing',
      });
    }

    const logData: Partial<McpLogEntry> = {
      operation,
      serverId,
      protocolVersion: details.protocolVersion,
      capabilities: details.capabilities,
      metadata: {
        ...details.metadata,
        transportType: transport?.type,
        transportInfo: transport?.info,
        httpSettings: transport?.httpSettings,
      },
    };

    if (details.error) {
      appLogger.mcp?.error(`Server lifecycle error: ${operation}`, details.error, {
        ...logData,
        correlationId,
        userId: context?.userId,
      });
    } else {
      appLogger.mcp?.info(`Server lifecycle: ${operation}`, {
        ...logData,
        correlationId,
        userId: context?.userId,
      });
    }

    // Update server status
    const serverInfo = this.serverRegistry.get(serverId);
    if (serverInfo) {
      switch (operation) {
        case McpOperation.INITIALIZE:
          serverInfo.status = 'ready';
          break;
        case McpOperation.SERVER_SHUTDOWN:
          serverInfo.status = 'shutdown';
          break;
        case McpOperation.ERROR_HANDLING:
          serverInfo.status = 'error';
          break;
      }
    }
  }

  /**
   * Log tool execution start
   */
  public logToolExecutionStart(
    toolName: string,
    serverId: string,
    requestId: string | number,
    parameters?: Record<string, unknown>
  ): string {
    const executionId = `${serverId}-${toolName}-${requestId}-${Date.now()}`;
    const startTime = Date.now();
    const correlationId = getCurrentCorrelationId();
    const context = getCurrentContext();

    const execution: McpToolExecution = {
      toolName,
      serverId,
      requestId,
      parameters: this.sanitizeParams(parameters || {}),
      startTime,
    };

    this.activeExecutions.set(executionId, execution);

    const logData: Partial<McpLogEntry> = {
      operation: McpOperation.TOOL_CALL,
      serverId,
      toolName,
      jsonRpcId: requestId,
      timing: {
        startTime,
        endTime: 0,
        duration: 0,
      },
      metadata: {
        executionId,
        parameters: execution.parameters,
      },
    };

    appLogger.mcp?.info('Tool execution started', {
      ...logData,
      correlationId,
      userId: context?.userId,
    });

    return executionId;
  }

  /**
   * Log tool execution completion
   */
  public logToolExecutionEnd(
    executionId: string,
    result?: unknown,
    error?: Error
  ): void {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      appLogger.mcp?.warn('Tool execution not found for completion logging', {
        executionId,
      });
      return;
    }

    const endTime = Date.now();
    const duration = endTime - execution.startTime;
    const correlationId = getCurrentCorrelationId();
    const context = getCurrentContext();

    execution.endTime = endTime;
    execution.duration = duration;
    execution.result = result;
    execution.error = error;

    // Track performance metrics
    this.addPerformanceMetric(execution.toolName, duration);

    const logData: Partial<McpLogEntry> = {
      operation: McpOperation.TOOL_RESULT,
      serverId: execution.serverId,
      toolName: execution.toolName,
      jsonRpcId: execution.requestId,
      timing: {
        startTime: execution.startTime,
        endTime,
        duration,
      },
      metadata: {
        executionId,
        hasResult: !!result,
        hasError: !!error,
        resultSize: result ? JSON.stringify(result).length : 0,
      },
    };

    if (error) {
      // Classify and handle the error
      errorHandler.handle(error, {
        operation: `MCP tool execution: ${execution.toolName}`,
        correlationId,
        metadata: {
          serverId: execution.serverId,
          toolName: execution.toolName,
          duration,
        },
      });

      appLogger.mcp?.error('Tool execution failed', error, {
        ...logData,
        correlationId,
        userId: context?.userId,
      });
    } else {
      appLogger.mcp?.info('Tool execution completed', {
        ...logData,
        correlationId,
        userId: context?.userId,
      });
    }

    // Clean up
    this.activeExecutions.delete(executionId);
  }

  /**
   * Log resource access
   */
  public logResourceAccess(
    resourceAccess: Omit<McpResourceAccess, 'endTime' | 'duration'>,
    result?: { content: string; mimeType?: string },
    error?: Error
  ): void {
    const endTime = Date.now();
    const duration = endTime - resourceAccess.startTime;
    const correlationId = getCurrentCorrelationId();
    const context = getCurrentContext();

    const logData: Partial<McpLogEntry> = {
      operation: McpOperation.RESOURCE_ACCESS,
      serverId: resourceAccess.serverId,
      resourceUri: resourceAccess.resourceUri,
      jsonRpcId: resourceAccess.requestId,
      timing: {
        startTime: resourceAccess.startTime,
        endTime,
        duration,
      },
      metadata: {
        mimeType: result?.mimeType || resourceAccess.mimeType,
        size: result?.content?.length || resourceAccess.size,
        cached: resourceAccess.cached,
      },
    };

    if (error) {
      appLogger.mcp?.error('Resource access failed', error, {
        ...logData,
        correlationId,
        userId: context?.userId,
      });
    } else {
      appLogger.mcp?.info('Resource accessed', {
        ...logData,
        correlationId,
        userId: context?.userId,
      });
    }
  }

  /**
   * Log capability negotiation
   */
  public logCapabilityNegotiation(
    serverId: string,
    clientCapabilities: string[],
    serverCapabilities: string[],
    negotiatedCapabilities: string[],
    protocolVersion: McpProtocolVersion
  ): void {
    const correlationId = getCurrentCorrelationId();
    const context = getCurrentContext();

    const logData: Partial<McpLogEntry> = {
      operation: McpOperation.CAPABILITY_NEGOTIATION,
      serverId,
      protocolVersion,
      capabilities: negotiatedCapabilities,
      metadata: {
        clientCapabilities,
        serverCapabilities,
        negotiatedCapabilities,
      },
    };

    appLogger.mcp?.info('Capability negotiation completed', {
      ...logData,
      correlationId,
      userId: context?.userId,
    });

    // Update server registry
    const serverInfo = this.serverRegistry.get(serverId);
    if (serverInfo) {
      serverInfo.capabilities = negotiatedCapabilities;
      serverInfo.protocolVersion = protocolVersion;
    }
  }

  /**
   * Get server information
   */
  public getServerInfo(serverId: string): McpServerInfo | undefined {
    return this.serverRegistry.get(serverId);
  }

  /**
   * Get all registered servers
   */
  public getAllServers(): McpServerInfo[] {
    return Array.from(this.serverRegistry.values());
  }

  /**
   * Get performance metrics for a tool
   */
  public getToolPerformanceMetrics(toolName: string): {
    count: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    lastDuration: number;
  } | null {
    const durations = this.performanceMetrics.get(toolName);
    if (!durations || durations.length === 0) {
      return null;
    }

    return {
      count: durations.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      lastDuration: durations[durations.length - 1],
    };
  }

  /**
   * Get aggregated server statistics
   */
  public getServerStatistics(): {
    totalServers: number;
    activeServers: number;
    errorServers: number;
    totalExecutions: number;
    averageExecutionTime: number;
  } {
    const servers = Array.from(this.serverRegistry.values());
    const activeServers = servers.filter(s => s.status === 'ready').length;
    const errorServers = servers.filter(s => s.status === 'error').length;

    const allDurations = Array.from(this.performanceMetrics.values()).flat();
    const averageExecutionTime = allDurations.length > 0
      ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length
      : 0;

    return {
      totalServers: servers.length,
      activeServers,
      errorServers,
      totalExecutions: allDurations.length,
      averageExecutionTime,
    };
  }

  /**
   * Create MCP error from JSON-RPC error
   */
  public createMcpError(
    code: number,
    message?: string,
    data?: unknown
  ): Error {
    const errorMessage = message || (MCP_ERROR_MESSAGES as Record<number, string>)[code] || 'Unknown MCP error';
    const error = new Error(errorMessage);
    (error as unknown as { code: number; data: unknown; category: ErrorCategory }).code = code;
    (error as unknown as { code: number; data: unknown; category: ErrorCategory }).data = data;
    (error as unknown as { code: number; data: unknown; category: ErrorCategory }).category = ErrorCategory.MCP_PROTOCOL;
    return error;
  }

  /**
   * Helper methods
   */
  private getOperationFromMethod(method?: string): McpOperation {
    if (!method) return McpOperation.ERROR_HANDLING;

    if (method === 'initialize') return McpOperation.INITIALIZE;
    if (method.startsWith('tools/')) return McpOperation.TOOL_CALL;
    if (method.startsWith('resources/')) return McpOperation.RESOURCE_ACCESS;
    if (method.startsWith('prompts/')) return McpOperation.PROMPT_TEMPLATE;
    if (method === 'capabilities/list') return McpOperation.CAPABILITY_NEGOTIATION;

    return McpOperation.ERROR_HANDLING;
  }

  private getErrorSeverity(code: number): 'debug' | 'info' | 'warn' | 'error' {
    if (code === MCP_ERROR_CODES.INVALID_PARAMS || code === MCP_ERROR_CODES.METHOD_NOT_FOUND) {
      return 'warn';
    }
    if (code === MCP_ERROR_CODES.PARSE_ERROR || code === MCP_ERROR_CODES.INVALID_REQUEST) {
      return 'error';
    }
    if (code >= MCP_ERROR_CODES.SERVER_ERROR) {
      return 'error';
    }
    return 'warn';
  }

  private sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];

    for (const [key, value] of Object.entries(params)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 1000) {
        sanitized[key] = value.substring(0, 1000) + '... [TRUNCATED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private addPerformanceMetric(toolName: string, duration: number): void {
    if (!this.performanceMetrics.has(toolName)) {
      this.performanceMetrics.set(toolName, []);
    }

    const durations = this.performanceMetrics.get(toolName)!;
    durations.push(duration);

    // Keep only last 100 measurements
    if (durations.length > 100) {
      durations.shift();
    }
  }
}

// Singleton instance
export const mcpLogger = McpLogger.getInstance();

// Convenience functions
export const logJsonRpcMessage = (
  message: JsonRpcMessage,
  messageType: JsonRpcMessageType,
  serverId?: string,
  transport?: McpTransportType
) => mcpLogger.logJsonRpcMessage(message, messageType, serverId, transport);

export const logServerLifecycle = (
  operation: McpOperation,
  serverId: string,
  details?: Parameters<typeof mcpLogger.logServerLifecycle>[2]
) => mcpLogger.logServerLifecycle(operation, serverId, details);

export const logToolExecutionStart = (
  toolName: string,
  serverId: string,
  requestId: string | number,
  parameters?: Record<string, unknown>
) => mcpLogger.logToolExecutionStart(toolName, serverId, requestId, parameters);

export const logToolExecutionEnd = (
  executionId: string,
  result?: unknown,
  error?: Error
) => mcpLogger.logToolExecutionEnd(executionId, result, error);

export const logResourceAccess = (
  resourceAccess: Parameters<typeof mcpLogger.logResourceAccess>[0],
  result?: Parameters<typeof mcpLogger.logResourceAccess>[1],
  error?: Error
) => mcpLogger.logResourceAccess(resourceAccess, result, error);

export const logCapabilityNegotiation = (
  serverId: string,
  clientCapabilities: string[],
  serverCapabilities: string[],
  negotiatedCapabilities: string[],
  protocolVersion: McpProtocolVersion
) => mcpLogger.logCapabilityNegotiation(
  serverId,
  clientCapabilities,
  serverCapabilities,
  negotiatedCapabilities,
  protocolVersion
);

// All types and constants are already exported when declared above
// (McpProtocolVersion, JsonRpcMessageType, McpTransportType, MCP_ERROR_CODES, MCP_ERROR_MESSAGES)

// Default export
export default mcpLogger; 