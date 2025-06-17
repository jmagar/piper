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
// --- MODIFIED/NEW INTERFACES START ---

// Specific configuration for STDIO transport
export interface StdioServerConfig {
  type: 'stdio';
  command: string; // Required for STDIO
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  // Fields from original EnhancedStdioConfig that are common or can be here
  stderr?: 'inherit' | 'ignore' | 'pipe';
  clientName?: string;
  logger?: ContextualLogMethods; // This might be runtime-only, not from config.json
  onUncaughtError?: (error: unknown) => void; // Runtime-only
}

// Specific configuration for SSE transport
export interface SseServerConfig {
  type: 'sse';
  url: string; // Required for SSE
  Headers?: Record<string, string>;
  // Fields from original EnhancedSSEConfig
  clientName?: string;
  logger?: ContextualLogMethods; // Runtime-only
  onUncaughtError?: (error: unknown) => void; // Runtime-only
}

// Specific configuration for Streamable HTTP transport
export interface StreamableHttpServerConfig {
  type: 'streamableHttp';
  url: string; // Required for Streamable HTTP
  Headers?: Record<string, string>;
  sessionId?: string; // Specific to Streamable HTTP
  // Fields from original EnhancedStreamableHTTPConfig
  clientName?: string;
  logger?: ContextualLogMethods; // Runtime-only
  onUncaughtError?: (error: unknown) => void; // Runtime-only
}

// Common server configuration properties
export interface BaseServerConfig {
  label?: string;
  name?: string; // Often the key of the server in mcpServers
  disabled?: boolean; // As per schema: true if disabled, false or undefined if enabled.
  timeout?: number; // As per schema (min: 30, default: 60)
  autoApprove?: string[]; // As per schema
  schemas?: Record<string, LocalMCPToolSchema>; // Retaining this as it seems useful for local schema definitions
}

// Discriminated union for ServerConfigEntry
export type ServerConfigEntry = BaseServerConfig & (
  | StdioServerConfig
  | SseServerConfig
  | StreamableHttpServerConfig
);

// --- MODIFIED/NEW INTERFACES END ---










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
} 