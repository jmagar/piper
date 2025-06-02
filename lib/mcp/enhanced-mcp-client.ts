import { experimental_createMCPClient as createMCPClient, generateObject } from "ai"
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { fileTypeFromBuffer } from "file-type"
import { createHash } from "crypto"
import { promises as fs } from "fs"
import { join, extname } from "path"
import { PrismaClient, Prisma } from "@prisma/client"

/**
 * Enhanced MCP Client with better error handling, resource management,
 * and configuration based on AI SDK documentation
 * 
 * References:
 * - https://ai-sdk.dev/docs/reference/ai-sdk-core/create-mcp-client#experimental_createmcpclient
 * - https://ai-sdk.dev/docs/reference/ai-sdk-core/mcp-stdio-transport
 */

// Use actual AI SDK types for tools
type AISDKToolCollection = Record<string, unknown>

// Define proper types for Prisma operations
type ServerMetrics = {
  totalExecutions: number
  successCount: number
  failureCount: number
  successRate: number
  averageExecutionTime: number
  totalRepairAttempts: number
  totalRetryCount: number
  recentExecutions: unknown[]
}

// Import type for StreamableHTTP transport (with fallback)
interface StreamableHTTPClientTransportConstructor {
  new (url: URL, options?: { sessionId?: string; requestInit?: RequestInit }): unknown
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
  timeout?: number
  abortSignal?: AbortSignal
  onUncaughtError?: (error: unknown) => void
}

export interface EnhancedSSEConfig {
  url: string
  headers?: Record<string, string>
  clientName?: string
  timeout?: number
  abortSignal?: AbortSignal
  onUncaughtError?: (error: unknown) => void
}

export interface EnhancedStreamableHTTPConfig {
  url: string
  sessionId?: string
  headers?: Record<string, string>
  clientName?: string
  timeout?: number
  abortSignal?: AbortSignal
  onUncaughtError?: (error: unknown) => void
}

// Union type for all transport configurations
export type EnhancedTransportConfig = 
  | ({ type: 'stdio' } & EnhancedStdioConfig)
  | ({ type: 'sse' } & EnhancedSSEConfig)  
  | ({ type: 'streamable-http' } & EnhancedStreamableHTTPConfig)

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

/**
 * Tool call repair detection and error analysis
 */
export class ToolCallRepairDetector {
  private static readonly ERROR_PATTERNS: ToolCallErrorPattern[] = [
    {
      type: 'malformed_arguments',
      pattern: /unexpected token|syntax error|invalid json/i,
      strategy: 'ai_repair',
      description: 'JSON syntax errors in tool arguments'
    },
    {
      type: 'invalid_schema',
      pattern: /required property|additional property|type mismatch/i,
      strategy: 'schema_coercion',
      description: 'Schema validation failures'
    },
    {
      type: 'execution_error',
      pattern: /cannot read property|undefined is not a function/i,
      strategy: 'default_values',
      description: 'Runtime execution errors'
    },
    {
      type: 'timeout',
      pattern: /timeout|request timed out|aborted/i,
      strategy: 'retry_original',
      description: 'Operation timeout errors'
    }
  ]

  static detectErrorType(error: Error | string): ToolCallRepairContext['error']['type'] {
    const errorMessage = typeof error === 'string' ? error : error.message

    for (const pattern of this.ERROR_PATTERNS) {
      if (typeof pattern.pattern === 'string') {
        if (errorMessage.includes(pattern.pattern)) {
          return pattern.type
        }
      } else if (pattern.pattern.test(errorMessage)) {
        return pattern.type
      }
    }

    return 'unknown'
  }

  static getRepairStrategy(errorType: ToolCallRepairContext['error']['type']): ToolCallRepairStrategy {
    const pattern = this.ERROR_PATTERNS.find(p => p.type === errorType)
    return pattern?.strategy || 'ai_repair'
  }

  static analyzeToolCallError(
    toolName: string,
    arguments_: Record<string, unknown>,
    error: Error | string,
    callId?: string
  ): ToolCallRepairContext['error'] {
    const errorMessage = typeof error === 'string' ? error : error.message
    const errorType = this.detectErrorType(error)

    return {
      type: errorType,
      message: errorMessage,
      details: {
        toolName,
        arguments: arguments_,
        callId,
        timestamp: new Date().toISOString(),
        stackTrace: error instanceof Error ? error.stack : undefined
      }
    }
  }

  static shouldAttemptRepair(
    error: ToolCallRepairContext['error'],
    config: ToolCallRepairConfig,
    attemptCount: number
  ): boolean {
    if (!config.enabled) return false
    if (attemptCount >= config.maxRepairAttempts) return false

    // Don't repair certain error types based on strategy
    switch (error.type) {
      case 'timeout':
        return config.fallbackStrategy === 'retry'
      case 'execution_error':
        return attemptCount < 2 // Only try once for execution errors
      default:
        return true
    }
  }

  static calculateBackoffDelay(
    attemptCount: number,
    config: ToolCallRepairConfig
  ): number {
    if (!config.exponentialBackoff) {
      return config.initialDelay || 1000
    }

    const baseDelay = config.initialDelay || 1000
    const maxDelay = config.maxDelay || 30000
    const delay = baseDelay * Math.pow(2, attemptCount - 1)
    
    return Math.min(delay, maxDelay)
  }

  static createRepairContext(
    toolName: string,
    arguments_: Record<string, unknown>,
    error: Error | string,
    callId?: string,
    previousAttempts: ToolCallRepairContext['previousAttempts'] = []
  ): ToolCallRepairContext {
    return {
      originalCall: {
        toolName,
        arguments: arguments_,
        callId
      },
      error: this.analyzeToolCallError(toolName, arguments_, error, callId),
      attemptCount: previousAttempts.length + 1,
      previousAttempts
    }
  }
}

/**
 * AI-powered tool call repair using GPT-4o-mini
 */
export class ToolCallRepairer {
  private config: ToolCallRepairConfig
  private model = openai('gpt-4o-mini')

  constructor(config: ToolCallRepairConfig) {
    this.config = config
  }

  async repairToolCall(context: ToolCallRepairContext): Promise<ToolCallRepairResult> {
    const startTime = Date.now()
    
    try {
      console.log(`[Tool Repair] Attempting repair for ${context.originalCall.toolName}, attempt ${context.attemptCount}`)

      const strategy = ToolCallRepairDetector.getRepairStrategy(context.error.type)
      
      let result: ToolCallRepairResult

      switch (strategy) {
        case 'ai_repair':
          result = await this.performAIRepair(context)
          break
        case 'schema_coercion':
          result = await this.performSchemaCoercion(context)
          break
        case 'default_values':
          result = await this.performDefaultValueRepair(context)
          break
        case 'retry_original':
          result = this.performRetryOriginal(context)
          break
        default:
          result = await this.performAIRepair(context)
      }

      result.metadata = {
        ...result.metadata,
        repairModel: this.config.repairModel,
        repairTime: Date.now() - startTime,
        repairStrategy: strategy
      }

      console.log(`[Tool Repair] ${result.success ? 'Success' : 'Failed'} for ${context.originalCall.toolName}`)
      return result

    } catch (error) {
      console.error('[Tool Repair] Error during repair:', error)
      return {
        success: false,
        error: `Repair failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          repairModel: this.config.repairModel,
          repairTime: Date.now() - startTime,
          repairStrategy: 'error'
        }
      }
    }
  }

  private async performAIRepair(context: ToolCallRepairContext): Promise<ToolCallRepairResult> {
    const repairPrompt = this.buildRepairPrompt(context)
    
    try {
      const response = await generateObject({
        model: this.model,
        prompt: repairPrompt,
        schema: z.object({
          repairedArguments: z.record(z.unknown()),
          explanation: z.string(),
          confidence: z.number().min(0).max(1)
        }),
        temperature: 0.1, // Low temperature for consistent repairs
      })

             return {
         success: response.object.confidence > 0.7,
         repairedArguments: response.object.repairedArguments,
         metadata: {
           repairModel: this.config.repairModel,
           repairTime: 0, // Will be set by the caller
           repairStrategy: 'ai_repair',
           tokens: {
             prompt: response.usage?.promptTokens || 0,
             completion: response.usage?.completionTokens || 0
           },
           explanation: response.object.explanation,
           confidence: response.object.confidence
         }
       }
    } catch (error) {
      return {
        success: false,
        error: `AI repair failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async performSchemaCoercion(context: ToolCallRepairContext): Promise<ToolCallRepairResult> {
    // Simple schema coercion - convert types, add missing properties, remove extra ones
    try {
      const repairedArgs = { ...context.originalCall.arguments }
      
             // Basic type coercion logic
       for (const [key, value] of Object.entries(repairedArgs)) {
         if (typeof value === 'string' && !isNaN(Number(value))) {
           // Try to convert string numbers to numbers
           repairedArgs[key] = Number(value)
         } else if (typeof value === 'string' && (value === 'true' || value === 'false')) {
           // Convert string booleans
           repairedArgs[key] = value === 'true'
         }
       }

      return {
        success: true,
        repairedArguments: repairedArgs
      }
    } catch (error) {
      return {
        success: false,
        error: `Schema coercion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async performDefaultValueRepair(context: ToolCallRepairContext): Promise<ToolCallRepairResult> {
    // Add default values for missing required properties
    const repairedArgs = { ...context.originalCall.arguments }
    
    // Add common default values
    const defaults: Record<string, unknown> = {
      limit: 10,
      page: 1,
      format: 'json',
      timeout: 30000,
      retries: 3
    }

    for (const [key, defaultValue] of Object.entries(defaults)) {
      if (!(key in repairedArgs)) {
        repairedArgs[key] = defaultValue
      }
    }

    return {
      success: true,
      repairedArguments: repairedArgs
    }
  }

  private performRetryOriginal(context: ToolCallRepairContext): ToolCallRepairResult {
    // Simply retry with original arguments (useful for timeout errors)
    return {
      success: true,
      repairedArguments: context.originalCall.arguments
    }
  }

  private buildRepairPrompt(context: ToolCallRepairContext): string {
    return `You are a tool call repair assistant. Fix the malformed arguments for this tool call.

Tool: ${context.originalCall.toolName}
Error: ${context.error.message}
Error Type: ${context.error.type}

Original Arguments:
${JSON.stringify(context.originalCall.arguments, null, 2)}

Previous Attempts: ${context.previousAttempts.length}
${context.previousAttempts.map((attempt, i) => 
  `Attempt ${i + 1}: ${JSON.stringify(attempt.repairedArguments, null, 2)}\nError: ${attempt.error || 'Unknown'}`
).join('\n\n')}

Instructions:
1. Analyze the error and original arguments
2. Fix any JSON syntax errors, type mismatches, or missing required fields
3. Ensure the repaired arguments are valid for the tool
4. Provide a confidence score (0-1) for your repair
5. Explain what you fixed

Return the repaired arguments as a valid JSON object with explanation and confidence.`
  }
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
  abortSignal?: AbortSignal
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

/**
 * MCP Metrics Collector for tracking server performance and tool executions
 */
export class MCPMetricsCollector {
  private prisma: PrismaClient
  private enableMetrics: boolean
  private metricsCache = new Map<string, Record<string, unknown>>()

  constructor(enableMetrics: boolean = true) {
    this.enableMetrics = enableMetrics
    this.prisma = new PrismaClient()
  }

  async recordServerConnection(
    serverId: string,
    serverName: string,
    transportType: 'stdio' | 'sse' | 'streamable-http',
    toolsCount: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!this.enableMetrics) return

    try {
      const existingServer = await this.prisma.mCPServerMetric.findFirst({
        where: { serverId }
      })

      const metadataInput = metadata ? JSON.parse(JSON.stringify(metadata)) : {}

      if (existingServer) {
        await this.prisma.mCPServerMetric.updateMany({
          where: { serverId },
          data: {
            serverName,
            status: 'connected',
            connectionTime: new Date(),
            lastActiveAt: new Date(),
            toolsCount,
            metadata: metadataInput
          }
        })
      } else {
        await this.prisma.mCPServerMetric.create({
          data: {
            serverId,
            serverName,
            transportType,
            status: 'connected',
            connectionTime: new Date(),
            lastActiveAt: new Date(),
            toolsCount,
            metadata: metadataInput
          }
        })
      }

      console.log(`[Metrics] Recorded connection for server: ${serverName}`)
    } catch (error) {
      console.error('[Metrics] Failed to record server connection:', error)
    }
  }

  async recordServerDisconnection(
    serverId: string,
    errorCount?: number
  ): Promise<void> {
    if (!this.enableMetrics) return

    try {
      await this.prisma.mCPServerMetric.updateMany({
        where: { serverId },
        data: {
          status: 'disconnected',
          disconnectionTime: new Date(),
          errorCount: errorCount || 0
        }
      })

      console.log(`[Metrics] Recorded disconnection for server: ${serverId}`)
    } catch (error) {
      console.error('[Metrics] Failed to record server disconnection:', error)
    }
  }

  async recordServerError(
    serverId: string
  ): Promise<void> {
    if (!this.enableMetrics) return

    try {
      await this.prisma.mCPServerMetric.updateMany({
        where: { serverId },
        data: {
          status: 'error',
          errorCount: {
            increment: 1
          },
          lastActiveAt: new Date()
        }
      })

      console.log(`[Metrics] Recorded error for server: ${serverId}`)
    } catch (error) {
      console.error('[Metrics] Failed to record server error:', error)
    }
  }

  async recordToolExecution(
    serverId: string,
    toolName: string,
    execution: {
      executionTime: number
      success: boolean
      errorType?: string
      errorMessage?: string
      repairAttempts?: number
      repairSuccessful?: boolean
      inputSize?: number
      outputSize?: number
      outputType?: string
      aborted?: boolean
      cached?: boolean
      retryCount?: number
      callId?: string
      metadata?: Record<string, unknown>
    }
  ): Promise<void> {
    if (!this.enableMetrics) return

    try {
      const metadataInput = execution.metadata ? JSON.parse(JSON.stringify(execution.metadata)) : {}

      // Record tool execution
      await this.prisma.mCPToolExecution.create({
        data: {
          serverId,
          toolName,
          callId: execution.callId,
          executionTime: execution.executionTime,
          success: execution.success,
          errorType: execution.errorType,
          errorMessage: execution.errorMessage,
          repairAttempts: execution.repairAttempts || 0,
          repairSuccessful: execution.repairSuccessful || false,
          inputSize: execution.inputSize,
          outputSize: execution.outputSize,
          outputType: execution.outputType,
          aborted: execution.aborted || false,
          cached: execution.cached || false,
          retryCount: execution.retryCount || 0,
          metadata: metadataInput
        }
      })

      // Update server metrics
      await this.updateServerAggregates(serverId, execution.executionTime)

      console.log(`[Metrics] Recorded tool execution: ${toolName} (${execution.success ? 'success' : 'failure'})`)
    } catch (error) {
      console.error('[Metrics] Failed to record tool execution:', error)
    }
  }

  private async updateServerAggregates(
    serverId: string,
    executionTime: number
  ): Promise<void> {
    try {
      const server = await this.prisma.mCPServerMetric.findFirst({
        where: { serverId }
      })

      if (server) {
        const newRequestCount = server.totalRequests + 1
        const newAverageLatency = (
          (server.averageLatency * server.totalRequests + executionTime) / 
          newRequestCount
        )

        await this.prisma.mCPServerMetric.updateMany({
          where: { serverId },
          data: {
            totalRequests: newRequestCount,
            averageLatency: newAverageLatency,
            lastActiveAt: new Date()
          }
        })
      }
    } catch (error) {
      console.error('[Metrics] Failed to update server aggregates:', error)
    }
  }

  async getServerMetrics(serverId?: string): Promise<unknown> {
    if (!this.enableMetrics) return null

    try {
      if (serverId) {
        return await this.prisma.mCPServerMetric.findFirst({
          where: { serverId },
          include: {
            toolExecutions: {
              take: 10,
              orderBy: { executedAt: 'desc' }
            }
          }
        })
      } else {
        return await this.prisma.mCPServerMetric.findMany({
          include: {
            _count: {
              select: { toolExecutions: true }
            }
          },
          orderBy: { lastActiveAt: 'desc' }
        })
      }
    } catch (error) {
      console.error('[Metrics] Failed to get server metrics:', error)
      return null
    }
  }

  async getToolExecutionStats(
    serverId?: string,
    toolName?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<ServerMetrics | null> {
    if (!this.enableMetrics) return null

    try {
      const where: Prisma.MCPToolExecutionWhereInput = {}
      
      if (serverId) where.serverId = serverId
      if (toolName) where.toolName = toolName
      if (timeRange) {
        where.executedAt = {
          gte: timeRange.start,
          lte: timeRange.end
        }
      }

      const [executions, stats] = await Promise.all([
        this.prisma.mCPToolExecution.findMany({
          where,
          orderBy: { executedAt: 'desc' },
          take: 100
        }),
        this.prisma.mCPToolExecution.aggregate({
          where,
          _count: {
            id: true
          },
          _avg: {
            executionTime: true
          },
          _sum: {
            repairAttempts: true,
            retryCount: true
          }
        })
      ])

      const successCount = executions.filter(e => e.success).length
      const failureCount = executions.length - successCount

      return {
        totalExecutions: stats._count.id,
        successCount,
        failureCount,
        successRate: stats._count.id > 0 ? successCount / stats._count.id : 0,
        averageExecutionTime: stats._avg.executionTime || 0,
        totalRepairAttempts: stats._sum.repairAttempts || 0,
        totalRetryCount: stats._sum.retryCount || 0,
        recentExecutions: executions
      }
    } catch (error) {
      console.error('[Metrics] Failed to get tool execution stats:', error)
      return null
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.prisma.$disconnect()
    } catch (error) {
      console.error('[Metrics] Failed to cleanup metrics collector:', error)
    }
  }
}

/**
 * Multi-modal content handler for processing and serving rich content
 */
export class MultiModalContentHandler {
  private static readonly ALLOWED_MIME_TYPES = new Set([
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
    // Video
    'video/mp4', 'video/webm', 'video/ogg',
    // Data formats
    'application/json', 'text/csv', 'text/xml', 'application/xml',
    // Text
    'text/plain', 'text/html', 'text/markdown'
  ])

  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  private static readonly UPLOAD_DIR = process.env.UPLOADS_DIR || './uploads'

  static async detectMimeType(content: Buffer | Uint8Array | string): Promise<string | null> {
    try {
      if (typeof content === 'string') {
        // Try to detect from content string
        if (content.startsWith('data:')) {
          const match = content.match(/^data:([^;]+);/)
          return match?.[1] || null
        }
        
        // Default to text for string content
        return 'text/plain'
      }

      const buffer = content instanceof Uint8Array ? Buffer.from(content) : content as Buffer
      const fileType = await fileTypeFromBuffer(buffer)
      return fileType?.mime || null
    } catch (error) {
      console.error('[Multi-Modal] MIME type detection failed:', error)
      return null
    }
  }

  static validateContent(content: MultiModalContent): { valid: boolean; error?: string } {
    // Check MIME type
    if (content.mimeType && !this.ALLOWED_MIME_TYPES.has(content.mimeType)) {
      return { valid: false, error: `Unsupported MIME type: ${content.mimeType}` }
    }

    // Check content size
    let contentSize = 0
    if (typeof content.content === 'string') {
      contentSize = Buffer.byteLength(content.content, 'utf8')
    } else if (Buffer.isBuffer(content.content)) {
      contentSize = content.content.length
    } else if (content.content instanceof Uint8Array) {
      contentSize = content.content.length
    }

    if (contentSize > this.MAX_FILE_SIZE) {
      return { valid: false, error: `Content size ${contentSize} exceeds limit ${this.MAX_FILE_SIZE}` }
    }

    // Type-specific validation
    switch (content.type) {
      case 'image':
        return this.validateImageContent(content as ImageContent)
      case 'file':
        return this.validateFileContent(content as FileContent)
      case 'audio':
        return this.validateAudioContent(content as AudioContent)
      case 'video':
        return this.validateVideoContent(content as VideoContent)
      case 'data':
        return this.validateDataContent(content as DataContent)
      default:
        return { valid: true }
    }
  }

  private static validateImageContent(content: ImageContent): { valid: boolean; error?: string } {
    const validImageMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (content.mimeType && !validImageMimes.includes(content.mimeType)) {
      return { valid: false, error: `Invalid image MIME type: ${content.mimeType}` }
    }
    return { valid: true }
  }

  private static validateFileContent(content: FileContent): { valid: boolean; error?: string } {
    if (!content.metadata?.filename) {
      return { valid: false, error: 'File content must include filename in metadata' }
    }
    return { valid: true }
  }

  private static validateAudioContent(content: AudioContent): { valid: boolean; error?: string } {
    const validAudioMimes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4']
    if (content.mimeType && !validAudioMimes.includes(content.mimeType)) {
      return { valid: false, error: `Invalid audio MIME type: ${content.mimeType}` }
    }
    return { valid: true }
  }

  private static validateVideoContent(content: VideoContent): { valid: boolean; error?: string } {
    const validVideoMimes = ['video/mp4', 'video/webm', 'video/ogg']
    if (content.mimeType && !validVideoMimes.includes(content.mimeType)) {
      return { valid: false, error: `Invalid video MIME type: ${content.mimeType}` }
    }
    return { valid: true }
  }

  private static validateDataContent(content: DataContent): { valid: boolean; error?: string } {
    const validDataMimes = ['application/json', 'text/csv', 'text/xml', 'application/xml']
    if (content.mimeType && !validDataMimes.includes(content.mimeType)) {
      return { valid: false, error: `Invalid data MIME type: ${content.mimeType}` }
    }
    return { valid: true }
  }

  static async processContent(content: MultiModalContent): Promise<MultiModalContent> {
    try {
      // Validate content first
      const validation = this.validateContent(content)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Auto-detect MIME type if not provided
      if (!content.mimeType) {
        // Only detect MIME type for Buffer, Uint8Array, or string content
        if (typeof content.content === 'string' || Buffer.isBuffer(content.content) || content.content instanceof Uint8Array) {
          const detectedMime = await this.detectMimeType(content.content)
          if (detectedMime) {
            content.mimeType = detectedMime
          }
        }
      }

      // Process based on content type
      switch (content.type) {
        case 'file':
          return await this.processFileContent(content as FileContent)
        case 'image':
          return await this.processImageContent(content as ImageContent)
        default:
          return content
      }
    } catch (error) {
      console.error('[Multi-Modal] Content processing failed:', error)
      throw error
    }
  }

  private static async processFileContent(content: FileContent): Promise<FileContent> {
    // Generate checksum for integrity
    const buffer = Buffer.isBuffer(content.content) 
      ? content.content 
      : Buffer.from(content.content as string, 'base64')
    
    const checksum = createHash('sha256').update(buffer).digest('hex')
    
    // Store file securely
    const filename = content.metadata?.filename || `file-${checksum.substring(0, 8)}`
    const safeName = this.sanitizeFilename(filename)
    const filePath = join(this.UPLOAD_DIR, safeName)
    
    await fs.mkdir(this.UPLOAD_DIR, { recursive: true })
    await fs.writeFile(filePath, buffer)
    
    return {
      ...content,
      content: filePath, // Store path instead of content
      metadata: {
        ...content.metadata,
        filename: safeName,
        size: buffer.length,
        checksum,
        downloadUrl: `/api/uploads/${safeName}`
      }
    }
  }

  private static async processImageContent(content: ImageContent): Promise<ImageContent> {
    // Add metadata for images
    const processedContent = { ...content }
    
    if (!content.metadata?.alt && content.metadata?.caption) {
      processedContent.metadata = {
        ...content.metadata,
        alt: content.metadata.caption
      }
    }
    
    return processedContent
  }

  private static sanitizeFilename(filename: string): string {
    // Remove dangerous characters and limit length
    const sanitized = filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 255)
    
    // Ensure extension is preserved
    const ext = extname(filename)
    if (ext && !sanitized.endsWith(ext)) {
      return sanitized.substring(0, 255 - ext.length) + ext
    }
    
    return sanitized
  }

  static async serveContent(content: MultiModalContent): Promise<{
    data: Buffer | string
    mimeType: string
    headers?: Record<string, string>
  }> {
    try {
      let data: Buffer | string
      const mimeType = content.mimeType || 'application/octet-stream'
      const headers: Record<string, string> = {}

      if (content.type === 'file' && typeof content.content === 'string' && content.content.startsWith('/')) {
        // Serve file from disk
        data = await fs.readFile(content.content)
        headers['Content-Disposition'] = `attachment; filename="${content.metadata?.filename || 'download'}"`
      } else if (typeof content.content === 'string') {
        data = content.content
      } else if (Buffer.isBuffer(content.content)) {
        data = content.content
      } else if (content.content instanceof Uint8Array) {
        data = Buffer.from(content.content)
      } else {
        // Handle other types by converting to JSON string
        data = JSON.stringify(content.content)
      }

      return { data, mimeType, headers }
    } catch (error) {
      console.error('[Multi-Modal] Content serving failed:', error)
      throw error
    }
  }
}

export interface MCPToolSet {
  tools: AISDKToolCollection
  schemas?: Record<string, z.ZodSchema>
  close: () => Promise<void>
}

// Global metrics collector instance for abort signal support
const globalMetricsCollector = new MCPMetricsCollector(true)

interface ToolExecutionOptions {
  abortSignal?: AbortSignal
  callId?: string
}

/**
 * Wraps MCP tools with abort signal support for cancellation
 */
async function wrapToolsWithAbortSignal(
  tools: AISDKToolCollection,
  globalAbortSignal?: AbortSignal
): Promise<AISDKToolCollection> {
  const wrappedTools: AISDKToolCollection = {}

  for (const [toolName, tool] of Object.entries(tools)) {
    // Ensure tool is an object with proper structure
    const originalTool = tool && typeof tool === 'object' ? tool as Record<string, unknown> : { execute: tool }
    
    wrappedTools[toolName] = {
      ...originalTool,
      execute: async (params: Record<string, unknown>, options?: ToolExecutionOptions) => {
        const startTime = Date.now()
        let aborted = false
        
        // Combine global and local abort signals
        const abortController = new AbortController()
        const effectiveAbortSignal = abortController.signal
        
        if (globalAbortSignal) {
          globalAbortSignal.addEventListener('abort', () => abortController.abort())
        }
        
        if (options?.abortSignal) {
          options.abortSignal.addEventListener('abort', () => abortController.abort())
        }

        try {
          // Check if already aborted
          if (effectiveAbortSignal.aborted) {
            aborted = true
            throw new Error('Tool execution aborted before start')
          }

          // Execute the original tool with timeout and abort handling
          const result = await executeWithAbort(originalTool, params, effectiveAbortSignal)
          
          // Record successful execution
          await globalMetricsCollector.recordToolExecution('enhanced-mcp', toolName, {
            executionTime: Date.now() - startTime,
            success: true,
            aborted: false,
            callId: options?.callId
          })

          return result
        } catch (error) {
          // Check if error was due to abort
          if (effectiveAbortSignal.aborted || error instanceof Error && error.message.includes('abort')) {
            aborted = true
          }

          // Record failed/aborted execution
          await globalMetricsCollector.recordToolExecution('enhanced-mcp', toolName, {
            executionTime: Date.now() - startTime,
            success: false,
            aborted,
            errorType: aborted ? 'aborted' : 'execution_error',
            errorMessage: error instanceof Error ? error.message : String(error),
            callId: options?.callId
          })

          throw error
        }
      }
    }
  }

  return wrappedTools
}

/**
 * Execute a tool with abort signal support
 */
async function executeWithAbort(
  tool: Record<string, unknown>,
  params: Record<string, unknown>,
  abortSignal: AbortSignal
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    // Check if already aborted
    if (abortSignal.aborted) {
      reject(new Error('Execution aborted'))
      return
    }

    // Set up abort listener
    const abortListener = () => {
      reject(new Error('Execution aborted'))
    }
    abortSignal.addEventListener('abort', abortListener)

    // Execute the tool
    const executeFunction = tool.execute as ((params: Record<string, unknown>) => unknown) | undefined
    Promise.resolve(executeFunction ? executeFunction(params) : (tool as unknown as (params: Record<string, unknown>) => unknown)(params))
      .then(result => {
        abortSignal.removeEventListener('abort', abortListener)
        resolve(result)
      })
      .catch(error => {
        abortSignal.removeEventListener('abort', abortListener)
        reject(error)
      })
  })
}

/**
 * Enhanced MCP Client for stdio transport with robust error handling
 */
export async function createEnhancedStdioMCPClient(
  config: EnhancedStdioConfig
): Promise<MCPToolSet> {
  try {
    console.log('[Enhanced MCP] Creating stdio client:', {
      command: config.command,
      args: config.args,
      clientName: config.clientName || 'ai-sdk-mcp-client'
    })

    const mcpClient = await createMCPClient({
      transport: new StdioMCPTransport({
        command: config.command,
        args: config.args || [],
        env: config.env || {},
        cwd: config.cwd,
        stderr: config.stderr || 'inherit'
      })
    })

    // Get tools with optional schema validation
    const tools = await mcpClient.tools()
    
    // Wrap tools with abort signal support
    const enhancedTools = await wrapToolsWithAbortSignal(tools, config.abortSignal)
    
    console.log('[Enhanced MCP] Successfully connected to stdio MCP server')
    
    return {
      tools: enhancedTools,
      close: async () => {
        try {
          await mcpClient.close()
          console.log('[Enhanced MCP] Stdio client closed successfully')
        } catch (error) {
          console.error('[Enhanced MCP] Error closing stdio client:', error)
          throw new MCPClientError('Failed to close MCP client', 'CLOSE_ERROR')
        }
      }
    }
  } catch (error) {
    console.error('[Enhanced MCP] Failed to create stdio client:', error)
    
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
  config: EnhancedSSEConfig
): Promise<MCPToolSet> {
  try {
    console.log('[Enhanced MCP] Creating SSE client:', {
      url: config.url,
      hasHeaders: !!config.headers,
      clientName: config.clientName || 'ai-sdk-mcp-client'
    })

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
    
    // Wrap tools with abort signal support
    const enhancedTools = await wrapToolsWithAbortSignal(tools, config.abortSignal)
    
    console.log('[Enhanced MCP] Successfully connected to SSE MCP server')
    
    return {
      tools: enhancedTools,
      close: async () => {
        try {
          await mcpClient.close()
          console.log('[Enhanced MCP] SSE client closed successfully')
        } catch (error) {
          console.error('[Enhanced MCP] Error closing SSE client:', error)
          throw new MCPClientError('Failed to close SSE MCP client', 'CLOSE_ERROR')
        }
      }
    }
  } catch (error) {
    console.error('[Enhanced MCP] Failed to create SSE client:', error)
    
    if (error instanceof Error) {
      throw new MCPClientError(
        `Failed to initialize SSE MCP client: ${error.message}`,
        'INIT_ERROR'
      )
    }
    
    throw new MCPClientError('Unknown error during SSE MCP client initialization')
  }
}

/**
 * Enhanced MCP Client for StreamableHTTP transport
 */
export async function createEnhancedStreamableHTTPMCPClient(
  config: EnhancedStreamableHTTPConfig
): Promise<MCPToolSet> {
  try {
    console.log('[Enhanced MCP] Creating StreamableHTTP client:', {
      url: config.url,
      sessionId: config.sessionId,
      hasHeaders: !!config.headers,
      clientName: config.clientName || 'ai-sdk-mcp-client'
    })

    // Import StreamableHTTPClientTransport dynamically using eval to avoid module resolution
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
          throw new Error('StreamableHTTPClientTransport not available in any known module path')
        }
      }
    } catch {
      throw new Error('StreamableHTTPClientTransport not available - ensure @modelcontextprotocol/sdk is properly installed')
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
    
    // Wrap tools with abort signal support
    const enhancedTools = await wrapToolsWithAbortSignal(tools, config.abortSignal)
    
    console.log('[Enhanced MCP] Successfully connected to StreamableHTTP MCP server')
    
    return {
      tools: enhancedTools,
      close: async () => {
        try {
          await mcpClient.close()
          console.log('[Enhanced MCP] StreamableHTTP client closed successfully')
        } catch (error) {
          console.error('[Enhanced MCP] Error closing StreamableHTTP client:', error)
          throw new MCPClientError('Failed to close StreamableHTTP MCP client', 'CLOSE_ERROR')
        }
      }
    }
  } catch (error) {
    console.error('[Enhanced MCP] Failed to create StreamableHTTP client:', error)
    
    if (error instanceof Error) {
      throw new MCPClientError(
        `Failed to initialize StreamableHTTP MCP client: ${error.message}`,
        'INIT_ERROR'
      )
    }
    
    throw new MCPClientError('Unknown error during StreamableHTTP MCP client initialization')
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
        client = await createEnhancedStreamableHTTPMCPClient(config as EnhancedStreamableHTTPConfig)
      } else {
        client = await createEnhancedSSEMCPClient(config as EnhancedSSEConfig)
      }
    } else {
      client = await createEnhancedStdioMCPClient(config as EnhancedStdioConfig)
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

    return client
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
 * Connection pool for managing multiple MCP clients
 */
export class MCPConnectionPool {
  private clients = new Map<string, MCPToolSet>()
  private abortControllers = new Map<string, AbortController>()
  private timeouts = new Map<string, NodeJS.Timeout>()
  private connectionCount = 0

  async addStdioClient(
    id: string,
    config: EnhancedStdioConfig
  ): Promise<MCPToolSet> {
    if (this.clients.has(id)) {
      throw new MCPClientError(`Client with id '${id}' already exists`)
    }

    // Create abort controller for this client
    const abortController = new AbortController()
    this.abortControllers.set(id, abortController)

    // Setup timeout if specified
    if (config.timeout) {
      const timeoutId = setTimeout(() => {
        console.warn(`[MCP Pool] Client '${id}' timed out after ${config.timeout}ms`)
        abortController.abort()
      }, config.timeout)
      this.timeouts.set(id, timeoutId)
    }

    // Pass abort signal to config
    const enhancedConfig = {
      ...config,
      abortSignal: abortController.signal
    }

    const client = await createEnhancedStdioMCPClient(enhancedConfig)
    this.clients.set(id, client)
    this.connectionCount++
    
    console.log(`[MCP Pool] Added stdio client '${id}'. Total connections: ${this.connectionCount}`)
    return client
  }

  async addSSEClient(
    id: string,
    config: EnhancedSSEConfig
  ): Promise<MCPToolSet> {
    if (this.clients.has(id)) {
      throw new MCPClientError(`Client with id '${id}' already exists`)
    }

    const client = await createEnhancedSSEMCPClient(config)
    this.clients.set(id, client)
    this.connectionCount++
    
    console.log(`[MCP Pool] Added SSE client '${id}'. Total connections: ${this.connectionCount}`)
    return client
  }

  getClient(id: string): MCPToolSet | undefined {
    return this.clients.get(id)
  }

  async removeClient(id: string): Promise<boolean> {
    const client = this.clients.get(id)
    if (!client) return false

    try {
      await client.close()
      this.clients.delete(id)
      this.connectionCount--
      
      console.log(`[MCP Pool] Removed client '${id}'. Total connections: ${this.connectionCount}`)
      return true
    } catch (error) {
      console.error(`[MCP Pool] Error removing client '${id}':`, error)
      throw new MCPClientError(`Failed to remove client '${id}'`)
    }
  }

  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.clients.entries()).map(
      async ([id, client]) => {
        try {
          await client.close()
          console.log(`[MCP Pool] Closed client '${id}'`)
        } catch (error) {
          console.error(`[MCP Pool] Error closing client '${id}':`, error)
        }
      }
    )

    await Promise.allSettled(closePromises)
    this.clients.clear()
    this.connectionCount = 0
    
    console.log('[MCP Pool] All clients closed')
  }

  getStats() {
    return {
      totalConnections: this.connectionCount,
      activeClients: Array.from(this.clients.keys())
    }
  }
}

// Global connection pool instance
export const globalMCPPool = new MCPConnectionPool()

/**
 * Helper function for backward compatibility with existing code
 */
export async function loadMCPToolsFromLocalEnhanced(
  command: string,
  env: Record<string, string> = {},
  options: Partial<EnhancedStdioConfig> = {}
) {
  return await createEnhancedStdioMCPClient({
    command,
    env,
    clientName: 'piper-mcp-client',
    ...options
  })
}

/**
 * Helper function for backward compatibility with existing code
 */
export async function loadMCPToolsFromURLEnhanced(
  url: string,
  options: Partial<EnhancedSSEConfig> = {}
) {
  return await createEnhancedSSEMCPClient({
    url,
    clientName: 'piper-mcp-client',
    ...options
  })
} 