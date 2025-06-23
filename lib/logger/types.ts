import { LogLevel, LogSource } from './constants';
import { CoreMessage } from 'ai';

// Base log entry interface (re-exported from main logger)
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  source: LogSource;
  message: string;
  correlationId?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  error?: ErrorInfo;
}

// Enhanced error information
export interface ErrorInfo {
  name: string;
  message: string;
  stack?: string;
  code?: string | number;
  statusCode?: number;
  details?: Record<string, unknown>;
}

// Error classification types
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  MCP_PROTOCOL = 'mcp_protocol',
  AI_SDK = 'ai_sdk',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  INTERNAL_SERVER = 'internal_server',
  UNKNOWN = 'unknown'
}

export interface ClassifiedError extends ErrorInfo {
  category: ErrorCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  userFacing: boolean;
}

// HTTP request/response logging types
export interface HttpLogEntry extends LogEntry {
  source: LogSource.HTTP;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    userAgent?: string;
    ip?: string;
    body?: unknown;
  };
  response: {
    statusCode: number;
    headers: Record<string, string>;
    body?: unknown;
    duration: number;
  };
}

// MCP-specific logging types
export enum McpOperation {
  INITIALIZE = 'initialize',
  CAPABILITY_NEGOTIATION = 'capability_negotiation',
  TOOL_CALL = 'tool_call',
  TOOL_RESULT = 'tool_result',
  RESOURCE_ACCESS = 'resource_access',
  PROMPT_TEMPLATE = 'prompt_template',
  SERVER_STARTUP = 'server_startup',
  SERVER_SHUTDOWN = 'server_shutdown',
  ERROR_HANDLING = 'error_handling',
  HEALTH_CHECK_FAILURE = 'health_check_failure',
  VALIDATE_CONFIG = 'validate_config'
}

export interface McpLogEntry extends LogEntry {
  source: LogSource.MCP;
  operation: McpOperation;
  serverId?: string;
  toolName?: string;
  resourceUri?: string;
  jsonRpcId?: string | number;
  protocolVersion?: string;
  capabilities?: string[];
  timing?: {
    startTime: number;
    endTime: number;
    duration: number;
  };
}

// AI SDK logging types
export enum AiSdkOperation {
  TOOL_EXECUTION = 'tool_execution',
  MODEL_CALL = 'model_call',
  STREAMING_START = 'streaming_start',
  STREAMING_CHUNK = 'streaming_chunk',
  STREAMING_END = 'streaming_end',
  STREAMING_ERROR = 'streaming_error',
  TOKEN_USAGE = 'token_usage',
  COST_TRACKING = 'cost_tracking',
  PROVIDER_ERROR = 'provider_error'
}

export interface AiSdkLogEntry extends LogEntry {
  source: LogSource.AI_SDK;
  operation: AiSdkOperation;
  provider?: string;
  model?: string;
  toolName?: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: string;
  };
  timing?: {
    startTime: number;
    endTime: number;
    duration: number;
  };
  streamInfo?: {
    chunkCount: number;
    totalSize: number;
    isComplete: boolean;
  };
}

// Context information for correlation
export interface LogContext {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  route?: string;
  method?: string;
  error?: Error | unknown;
  source?: LogSourceValue;
  url?: string;
  toolCallId?: string;
  messageId?: string;
  role?: string;
  messages?: Record<string, unknown>[]; // Consider importing PiperMessage[] | CoreMessage[] or specific log shapes
  coreMessages?: Record<string, unknown>[]; // Consider importing CoreMessage[] or specific log shapes
  finalMessagesForAI?: Record<string, unknown>[]; // Consider importing CoreMessage[] or specific log shapes
  stack?: string;
  chatId?: string;
  operationId?: string;
  args?: Record<string, unknown> | string;
  originalToolCallId?: string;
  model?: string;
  status?: string | number;
  originalToolName?: string;
  messageCount?: number;
  messageDetails?: Record<string, unknown>;
  hasAgent?: boolean;
  agentIdFromRequest?: string;
  hasTools?: boolean;
  coreMsg?: CoreMessage; // Added for detailed message logging
}

// Logger configuration types
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFileLogging: boolean;
  logsDirectory: string;
  maxFileSize: string;
  maxFiles: string;
  datePattern: string;
  enableRotation: boolean;
  enableCompression: boolean;
  enableErrorSeparation: boolean;
  enableJsonFormat: boolean;
}

// Health check types
export interface LoggerHealthCheck {
  status: 'healthy' | 'unhealthy';
  message: string;
  checks: {
    fileWriteAccess: boolean;
    diskSpace: {
      available: number;
      used: number;
      percentage: number;
    };
    rotationStatus: boolean;
    transportErrors: number;
  };
  timestamp: string;
}

// Log filtering and querying types
export interface LogFilter {
  levels?: LogLevel[];
  sources?: LogSource[];
  startDate?: Date;
  endDate?: Date;
  correlationId?: string;
  userId?: string;
  searchTerm?: string;
  errorCategory?: ErrorCategory;
  limit?: number;
  offset?: number;
}

export interface LogQueryResult {
  logs: LogEntry[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
}

// Middleware types
export interface LoggingMiddlewareConfig {
  enableRequestLogging: boolean;
  enableResponseLogging: boolean;
  enableErrorLogging: boolean;
  logBody: boolean;
  logHeaders: boolean;
  excludePaths: string[];
  sensitiveHeaders: string[];
  maxBodySize: number;
  enableCorrelationId: boolean;
}

export interface ErrorHandlingMiddlewareConfig {
  enableStackTrace: boolean;
  enableErrorDetails: boolean;
  enableUserFriendlyMessages: boolean;
  logUnhandledErrors: boolean;
  enableErrorClassification: boolean;
  enableRetryInfo: boolean;
}

// Security and privacy types
export interface SecurityConfig {
  enablePiiDetection: boolean;
  enableDataMasking: boolean;
  maskingPatterns: {
    email: boolean;
    phone: boolean;
    ssn: boolean;
    creditCard: boolean;
    apiKeys: boolean;
    passwords: boolean;
  };
  sensitiveFields: string[];
  enableLogAccess: boolean;
  authorizedRoles: string[];
}

// Log aggregation and metrics types
export interface LogMetrics {
  period: 'hour' | 'day' | 'week' | 'month';
  startTime: Date;
  endTime: Date;
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  errorRate: number;
  topErrors: Array<{
    message: string;
    count: number;
    category: ErrorCategory;
  }>;
  sourceBreakdown: Record<LogSource, number>;
  averageResponseTime?: number;
  slowestRequests?: Array<{
    url: string;
    duration: number;
    timestamp: string;
  }>;
}

// Export utility type helpers
export type LogSourceValue = string;

export interface IAppLogger {
  // Base methods - these can remain as they might involve async operations in some theoretical logger
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;

  // Contextual logging method - this is the primary way to use the logger
  logSource: (
    source: LogSourceValue,
    level: LogLevel,
    message: string,
    context?: LogContext,
  ) => void;

  // Method to create a logger instance with pre-filled context
  withContext: (context: Partial<LogContext> | LogSourceValue) => LoggerInstance;

  // Optional, source-specific loggers for convenience
  mcp?: LoggerInstance;
  aiSdk: LoggerInstance;
}

export type LoggerInstance = {
  debug: (message: string, metadata?: Record<string, unknown>) => void;
  info: (message: string, metadata?: Record<string, unknown>) => void;
  warn: (message: string, metadata?: Record<string, unknown>) => void;
  error: (message: string, error?: Error, metadata?: Record<string, unknown>) => void;
  fatal: (message: string, error?: Error, metadata?: Record<string, unknown>) => void;
};

export type ContextualLogger = LoggerInstance & {
  withContext: (context: Partial<LogContext>) => LoggerInstance;
};

export type SourceSpecificLogger = {
  [K in LogSource]: LoggerInstance;
};

// Re-export enums from constants
export { LogLevel } from './constants';