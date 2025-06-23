import { z } from "zod"

// Use actual AI SDK types for tools
export type AISDKToolCollection = Record<string, unknown>

// Logger type
import { type ContextualLogMethods } from '@/lib/logger';

export interface MCPLogger {
  debug: (message: string, metadata?: Record<string, unknown> | string | number) => void;
  info: (message: string, metadata?: Record<string, unknown> | string | number) => void;
  warn: (message: string, metadata?: Record<string, unknown> | string | number | unknown) => void;
  error: (message: string, error?: Error | unknown, metadata?: Record<string, unknown>) => void;
}

// Circuit breaker state types for resilient connections
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

// Retry configuration for enhanced error handling
export interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

// Schema definition for type-safe tool validation
export interface SchemaDefinition {
  name?: string;
  parameters?: z.ZodSchema;
  description?: string;
  examples?: Array<{
    input: Record<string, unknown>;
    output?: unknown;
  }>;
}

// Define proper types for Prisma operations
export type ServerMetrics = {
  totalExecutions: number
  successCount: number
  failureCount: number
  successRate: number
  averageExecutionTime: number
  totalRepairAttempts: number
  totalRetryCount: number
  recentExecutions: unknown[]
}

export interface GlobalMCPSummary {
  totalRequests: number;
  errorRate: number;
  avgResponseTime: number;
  activeUsers: number;
}

// Error types based on AI SDK documentation
export class MCPClientError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message)
    this.name = 'MCPClientError'
  }
}

export class CallToolError extends Error {
  constructor(message: string, public readonly toolName?: string) {
    super(message)
    this.name = 'CallToolError'
  }
}

// Enhanced configuration interfaces
export interface EnhancedStdioConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  stderr?: 'inherit' | 'ignore' | 'pipe'
  clientName?: string
  logger?: ContextualLogMethods
  timeout?: number
  onUncaughtError?: (error: unknown) => void
}

export interface EnhancedSSEConfig {
  url: string
  headers?: Record<string, string>
  clientName?: string
  logger?: ContextualLogMethods
  timeout?: number
  onUncaughtError?: (error: unknown) => void
}

export interface EnhancedStreamableHTTPConfig {
  url: string
  sessionId?: string
  headers?: Record<string, string>
  clientName?: string
  logger?: ContextualLogMethods
  timeout?: number
  onUncaughtError?: (error: unknown) => void
}

// Union type for all transport configurations
export type EnhancedTransportConfig = 
  | ({ type: 'stdio' } & EnhancedStdioConfig)
  | ({ type: 'sse' } & EnhancedSSEConfig)  
  | ({ type: 'streamable-http' } & EnhancedStreamableHTTPConfig)

// Configuration types for config.json
export type LocalMCPToolSchema = {
  [key: string]: unknown;
};

export interface FetchedToolInfo {
  name: string;
  description?: string;
  inputSchema?: unknown;
  annotations?: unknown;
  [key: string]: unknown;
}

export interface ServerConfigEntry {
  label?: string;
  disabled?: boolean; // Legacy: will be converted to 'enabled'
  enabled?: boolean;  // New: true if server is enabled, false or undefined if disabled
  transportType?: 'stdio' | 'sse' | 'streamable-http'; // Legacy: for inferring transport
  name?: string;
  transport?: EnhancedTransportConfig; // Can be inferred from top-level command/url
  schemas?: Record<string, LocalMCPToolSchema>;
  // Fallback properties for transport inference
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  url?: string;
  headers?: Record<string, string>;
}

export interface AppConfig {
  mcpServers: Record<string, ServerConfigEntry>;
}

// Tool call repair configuration interfaces
export interface ToolCallRepairConfig {
  enabled: boolean
  repairModel: string
  maxRepairAttempts: number
  fallbackStrategy: 'skip' | 'error' | 'retry'
  repairTimeout: number
  exponentialBackoff?: boolean
  initialDelay?: number
  maxDelay?: number
}

export interface ToolCallRepairContext {
  originalCall: {
    toolName: string
    arguments: Record<string, unknown>
    callId?: string
  }
  error: {
    type: 'malformed_arguments' | 'invalid_schema' | 'execution_error' | 'timeout' | 'unknown'
    message: string
    details?: Record<string, unknown>
  }
  attemptCount: number
  previousAttempts: Array<{
    repairedArguments: Record<string, unknown>
    error?: string
    timestamp: Date
  }>
}

export interface ToolCallRepairResult {
  success: boolean
  repairedArguments?: Record<string, unknown>
  error?: string
  metadata?: {
    repairModel: string
    tokens?: {
      prompt: number
      completion: number
    }
    repairTime: number
    repairStrategy: string
    explanation?: string
    confidence?: number
  }
}

export type ToolCallRepairStrategy = 'ai_repair' | 'schema_coercion' | 'default_values' | 'retry_original'

export interface ToolCallErrorPattern {
  type: ToolCallRepairContext['error']['type']
  pattern: RegExp | string
  strategy: ToolCallRepairStrategy
  description: string
}

// Multi-modal result type definitions
export interface MultiModalContent {
  type: 'text' | 'image' | 'file' | 'audio' | 'video' | 'data'
  content: string | Buffer | Uint8Array | Record<string, unknown> | Array<unknown>
  mimeType?: string
  metadata?: Record<string, unknown>
}

export interface ImageContent extends MultiModalContent {
  type: 'image'
  content: string // Base64 encoded or URL
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'image/svg+xml'
  metadata?: {
    width?: number
    height?: number
    alt?: string
    caption?: string
    source?: string
  }
}

export interface FileContent extends MultiModalContent {
  type: 'file'
  content: string | Buffer // File content or path
  mimeType?: string
  metadata?: {
    filename: string
    size?: number
    encoding?: string
    checksum?: string
    downloadUrl?: string
  }
}

export interface AudioContent extends MultiModalContent {
  type: 'audio'
  content: string // Base64 encoded or URL
  mimeType: 'audio/mpeg' | 'audio/wav' | 'audio/ogg' | 'audio/mp4'
  metadata?: {
    duration?: number
    bitrate?: number
    channels?: number
    sampleRate?: number
    transcript?: string
  }
}

export interface VideoContent extends MultiModalContent {
  type: 'video'
  content: string // Base64 encoded or URL  
  mimeType: 'video/mp4' | 'video/webm' | 'video/ogg'
  metadata?: {
    duration?: number
    width?: number
    height?: number
    bitrate?: number
    framerate?: number
    thumbnail?: string
  }
}

export interface DataContent extends MultiModalContent {
  type: 'data'
  content: Record<string, unknown> | Array<unknown> | string
  mimeType: 'application/json' | 'text/csv' | 'text/xml' | 'application/xml'
  metadata?: {
    schema?: Record<string, unknown>
    format?: string
    encoding?: string
    structure?: 'object' | 'array' | 'table' | 'tree'
  }
}

export type MultiModalToolResult = 
  | { type: 'text'; content: string }
  | ImageContent
  | FileContent  
  | AudioContent
  | VideoContent
  | DataContent
  | {
      type: 'mixed'
      contents: MultiModalContent[]
      metadata?: {
        title?: string
        description?: string
        source?: string
      }
    }

export interface RichToolResult {
  success: boolean
  result?: MultiModalToolResult | MultiModalToolResult[]
  error?: string
  metadata?: {
    executionTime?: number
    toolVersion?: string
    source?: string
    cached?: boolean
  }
}

// Enhanced tool execution context with multi-modal support
export interface EnhancedToolExecutionContext {
  toolName: string
  arguments: Record<string, unknown>
  callId?: string
  timeout?: number
  retryConfig?: {
    maxAttempts: number
    delay: number
    exponentialBackoff: boolean
  }
  repairConfig?: ToolCallRepairConfig
}

export interface EnhancedToolExecutionResult {
  success: boolean
  result?: MultiModalToolResult | MultiModalToolResult[]
  error?: string
  metadata?: {
    executionTime: number
    toolName: string
    callId?: string
    repairAttempts?: number
    fromCache?: boolean
    aborted?: boolean
  }
}

export interface MCPToolSet {
  tools: AISDKToolCollection
  schemas?: Record<string, z.ZodSchema>
  close: () => Promise<void>
  healthCheck?: () => Promise<boolean>; // Added for proactive health checking
  typedTools?: Record<string, z.ZodSchema>
  circuitBreakerState?: () => CircuitBreakerState; // Added for enhanced clients
} 