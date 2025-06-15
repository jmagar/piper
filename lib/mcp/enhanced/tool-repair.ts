import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"
import {
  ToolCallRepairConfig,
  ToolCallRepairContext,
  ToolCallRepairResult,
  ToolCallRepairStrategy,
  ToolCallErrorPattern
} from './types'

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

/**
 * Comprehensive tool repair service that combines detection and repair
 */
export class ToolRepairService {
  private repairer: ToolCallRepairer
  private config: ToolCallRepairConfig

  constructor(config: ToolCallRepairConfig) {
    this.config = config
    this.repairer = new ToolCallRepairer(config)
  }

  async attemptRepair(
    toolName: string,
    arguments_: Record<string, unknown>,
    error: Error | string,
    callId?: string,
    previousAttempts: ToolCallRepairContext['previousAttempts'] = []
  ): Promise<ToolCallRepairResult> {
    const context = ToolCallRepairDetector.createRepairContext(
      toolName,
      arguments_,
      error,
      callId,
      previousAttempts
    )

    // Check if repair should be attempted
    if (!ToolCallRepairDetector.shouldAttemptRepair(context.error, this.config, context.attemptCount)) {
      return {
        success: false,
        error: 'Repair not attempted based on configuration or limits'
      }
    }

    // Calculate backoff delay if not the first attempt
    if (context.attemptCount > 1) {
      const delay = ToolCallRepairDetector.calculateBackoffDelay(context.attemptCount, this.config)
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    return await this.repairer.repairToolCall(context)
  }

  updateConfig(newConfig: Partial<ToolCallRepairConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.repairer = new ToolCallRepairer(this.config)
  }

  getConfig(): ToolCallRepairConfig {
    return { ...this.config }
  }
}

/**
 * Default repair configuration
 */
export const DEFAULT_REPAIR_CONFIG: ToolCallRepairConfig = {
  enabled: true,
  repairModel: 'gpt-4o-mini',
  maxRepairAttempts: 3,
  fallbackStrategy: 'error',
  repairTimeout: 30000,
  exponentialBackoff: true,
  initialDelay: 1000,
  maxDelay: 30000
} 