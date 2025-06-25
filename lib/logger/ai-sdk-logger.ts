import { appLogger } from './index';
import { getCurrentCorrelationId, getCurrentContext } from './correlation';
import { AiSdkLogEntry, AiSdkOperation, ErrorCategory } from './types';
import { errorHandler } from './error-handler';

// Re-export AiSdkOperation for external use
export { AiSdkOperation } from './types';

// AI Provider types
export enum AiProvider {
  OPENAI = 'openai',
  OPENROUTER = 'openrouter',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  COHERE = 'cohere',
  MISTRAL = 'mistral',
  CUSTOM = 'custom',
}

// AI Model categories
export enum ModelCategory {
  CHAT = 'chat',
  COMPLETION = 'completion',
  EMBEDDING = 'embedding',
  VISION = 'vision',
  AUDIO = 'audio',
  MULTIMODAL = 'multimodal',
}

// Streaming operation states
export enum StreamingState {
  STARTED = 'started',
  CHUNK_RECEIVED = 'chunk_received',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

// Cost calculation interfaces
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CostInfo {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
  provider: AiProvider;
  model: string;
}

export interface ModelPricing {
  inputCostPer1k: number;
  outputCostPer1k: number;
  currency: string;
}

// Provider-specific pricing (simplified - in production this would be more comprehensive)
const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4o': { inputCostPer1k: 0.005, outputCostPer1k: 0.015, currency: 'USD' },
  'gpt-4-turbo': { inputCostPer1k: 0.01, outputCostPer1k: 0.03, currency: 'USD' },
  'gpt-3.5-turbo': { inputCostPer1k: 0.001, outputCostPer1k: 0.002, currency: 'USD' },
  'claude-3-opus': { inputCostPer1k: 0.015, outputCostPer1k: 0.075, currency: 'USD' },
  'claude-3-sonnet': { inputCostPer1k: 0.003, outputCostPer1k: 0.015, currency: 'USD' },
  'claude-3-haiku': { inputCostPer1k: 0.00025, outputCostPer1k: 0.00125, currency: 'USD' },
};

// AI operation tracking
export interface AiOperationContext {
  operationId: string;
  provider: AiProvider;
  model: string;
  operation: AiSdkOperation;
  startTime: number;
  endTime?: number;
  duration?: number;
  tokenUsage?: TokenUsage;
  cost?: CostInfo;
  streamInfo?: {
    chunkCount: number;
    totalSize: number;
    isComplete: boolean;
    lastChunkTime?: number;
  };
  error?: Error;
  metadata?: Record<string, unknown>;
}

export interface ToolExecutionContext {
  toolName: string;
  executionId: string;
  provider: AiProvider;
  model: string;
  parameters?: Record<string, unknown>;
  result?: unknown;
  error?: Error;
  startTime: number;
  endTime?: number;
  duration?: number;
  retryCount?: number;
}

/**
 * AI SDK-specific logger class
 */
export class AiSdkLogger {
  private static instance: AiSdkLogger;
  private activeOperations: Map<string, AiOperationContext> = new Map();
  private activeToolExecutions: Map<string, ToolExecutionContext> = new Map();
  private performanceMetrics: Map<string, number[]> = new Map();
  private costTracker: Map<AiProvider, number> = new Map();
  private tokenUsageTracker: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): AiSdkLogger {
    if (!AiSdkLogger.instance) {
      AiSdkLogger.instance = new AiSdkLogger();
    }
    return AiSdkLogger.instance;
  }

  /**
   * Start logging an AI operation
   */
  public startOperation(
    provider: AiProvider,
    model: string,
    operation: AiSdkOperation,
    metadata?: Record<string, unknown>
  ): string {
    const operationId = this.generateOperationId(provider, model, operation);
    const startTime = Date.now();
    const correlationId = getCurrentCorrelationId();
    const context = getCurrentContext();

    const operationContext: AiOperationContext = {
      operationId,
      provider,
      model,
      operation,
      startTime,
      metadata,
    };

    this.activeOperations.set(operationId, operationContext);

    const logData: Partial<AiSdkLogEntry> = {
      operation,
      provider,
      model,
      timing: {
        startTime,
        endTime: 0,
        duration: 0,
      },
      metadata: {
        operationId,
        ...metadata,
      },
    };

    appLogger.aiSdk.info('AI operation started', {
      ...logData,
      correlationId,
      userId: context?.userId,
    });

    return operationId;
  }

  /**
   * End an AI operation
   */
  public endOperation(
    operationId: string,
    result?: {
      tokenUsage?: TokenUsage;
      response?: unknown;
      error?: Error;
    }
  ): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      appLogger.aiSdk.warn('AI operation not found for completion logging', {
        operationId,
      });
      return;
    }

    const endTime = Date.now();
    const duration = endTime - operation.startTime;
    const correlationId = getCurrentCorrelationId();
    const context = getCurrentContext();

    operation.endTime = endTime;
    operation.duration = duration;
    operation.tokenUsage = result?.tokenUsage;
    operation.error = result?.error;

    // Calculate cost if token usage is available
    if (result?.tokenUsage) {
      operation.cost = this.calculateCost(
        operation.provider,
        operation.model,
        result.tokenUsage
      );
      
      // Track total cost
      this.addCostToTracker(operation.provider, operation.cost.totalCost);
      
      // Track token usage
      this.addTokenUsage(operation.model, result.tokenUsage.totalTokens);
    }

    // Track performance metrics
    this.addPerformanceMetric(`${operation.provider}-${operation.model}`, duration);

    const logData: Partial<AiSdkLogEntry> = {
      operation: operation.operation,
      provider: operation.provider,
      model: operation.model,
      tokenUsage: operation.tokenUsage,
      cost: operation.cost,
      timing: {
        startTime: operation.startTime,
        endTime,
        duration,
      },
      metadata: {
        operationId,
        hasResult: !!result?.response,
        hasError: !!result?.error,
        ...operation.metadata,
      },
    };

    if (result?.error) {
      // Classify and handle the error
      errorHandler.handle(result.error, {
        operation: `AI SDK ${operation.operation}: ${operation.model}`,
        correlationId,
        metadata: {
          provider: operation.provider,
          model: operation.model,
          duration,
          tokenUsage: operation.tokenUsage,
        },
      });

      appLogger.aiSdk.error('AI operation failed', result.error, {
        ...logData,
        correlationId,
        userId: context?.userId,
      });
    } else {
      appLogger.aiSdk.info('AI operation completed', {
        ...logData,
        correlationId,
        userId: context?.userId,
      });
    }

    // Clean up
    this.activeOperations.delete(operationId);
  }

  /**
   * Log streaming operation events
   */
  public logStreamingEvent(
    operationId: string,
    state: StreamingState,
    data?: {
      chunkData?: unknown;
      chunkSize?: number;
      totalChunks?: number;
      error?: Error;
    }
  ): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      appLogger.aiSdk.warn('Streaming operation not found', { operationId, state });
      return;
    }

    const correlationId = getCurrentCorrelationId();
    const context = getCurrentContext();

    // Update stream info
    if (!operation.streamInfo) {
      operation.streamInfo = {
        chunkCount: 0,
        totalSize: 0,
        isComplete: false,
      };
    }

    switch (state) {
      case StreamingState.CHUNK_RECEIVED:
        operation.streamInfo.chunkCount++;
        operation.streamInfo.totalSize += data?.chunkSize || 0;
        operation.streamInfo.lastChunkTime = Date.now();
        break;
      case StreamingState.COMPLETED:
        operation.streamInfo.isComplete = true;
        break;
      case StreamingState.ERROR:
      case StreamingState.CANCELLED:
        operation.streamInfo.isComplete = false;
        break;
    }

    const logData: Partial<AiSdkLogEntry> = {
      operation: AiSdkOperation.STREAMING_CHUNK,
      provider: operation.provider,
      model: operation.model,
      streamInfo: operation.streamInfo,
      metadata: {
        operationId,
        streamingState: state,
        chunkSize: data?.chunkSize,
        totalChunks: data?.totalChunks,
      },
    };

    const logLevel = state === StreamingState.ERROR ? 'error' : 'debug';
    
    const metaPayload = {
      ...logData,
      correlationId,
      userId: context?.userId,
    };

    if (data?.error) {
      if (logLevel === 'error') {
        appLogger.aiSdk.error(`Streaming ${state}`, data.error, metaPayload);
      } else { // logLevel is 'debug'
        appLogger.aiSdk.debug(`Streaming ${state}`, { ...metaPayload, streamingErrorDetails: { name: data.error.name, message: data.error.message, stack: data.error.stack } });
      }
    } else {
      // If no error, logLevel must be 'debug' based on current logic (state !== StreamingState.ERROR)
      appLogger.aiSdk.debug(`Streaming ${state}`, metaPayload);
    }
  }

  /**
   * Log tool execution
   */
  public logToolExecution(
    toolName: string,
    provider: AiProvider,
    model: string,
    execution: {
      parameters?: Record<string, unknown>;
      result?: unknown;
      error?: Error;
      startTime?: number;
      endTime?: number;
      retryCount?: number;
    }
  ): void {
    const executionId = this.generateExecutionId(toolName, provider);
    const startTime = execution.startTime || Date.now();
    const endTime = execution.endTime || Date.now();
    const duration = endTime - startTime;
    const correlationId = getCurrentCorrelationId();
    const context = getCurrentContext();

    // Sanitize parameters
    const sanitizedParams = this.sanitizeToolParameters(execution.parameters || {});

    const logData: Partial<AiSdkLogEntry> = {
      operation: AiSdkOperation.TOOL_EXECUTION,
      provider,
      model,
      toolName,
      timing: {
        startTime,
        endTime,
        duration,
      },
      metadata: {
        executionId,
        parameters: sanitizedParams,
        hasResult: !!execution.result,
        hasError: !!execution.error,
        retryCount: execution.retryCount || 0,
        resultSize: execution.result ? JSON.stringify(execution.result).length : 0,
      },
    };

    if (execution.error) {
      // Check if this is an AI SDK tool error that should be returned in result
      const isToolResultError = execution.error.message.includes('tool') || 
                               execution.error.message.includes('function');
      
      if (isToolResultError) {
        appLogger.aiSdk.warn('Tool execution returned error result', {
          ...logData,
          correlationId,
          userId: context?.userId,
          error: execution.error,
        });
      } else {
        appLogger.aiSdk.error('Tool execution failed', execution.error, {
          ...logData,
          correlationId,
          userId: context?.userId,
        });
      }
    } else {
      appLogger.aiSdk.info('Tool execution completed', {
        ...logData,
        correlationId,
        userId: context?.userId,
      });
    }

    // Track performance
    this.addPerformanceMetric(`tool-${toolName}`, duration);
  }

  /**
   * Log provider-specific errors
   */
  public logProviderError(
    provider: AiProvider,
    model: string,
    error: Error,
    context?: {
      operation?: AiSdkOperation;
      requestData?: Record<string, unknown>;
      responseData?: Record<string, unknown>;
    }
  ): void {
    const correlationId = getCurrentCorrelationId();
    const currentContext = getCurrentContext();

    // Classify provider-specific errors
    const errorCategory = this.classifyProviderError(provider, error);
    
    const logData: Partial<AiSdkLogEntry> = {
      operation: context?.operation || AiSdkOperation.PROVIDER_ERROR,
      provider,
      model,
      metadata: {
        errorCategory,
        providerErrorCode: this.getErrorCode(error),
        providerErrorType: this.getErrorType(error),
        requestData: this.sanitizeRequestData(context?.requestData || {}),
        responseData: context?.responseData,
      },
    };

    // Enhanced error handling based on provider
    errorHandler.handle(error, {
      operation: `AI Provider ${provider} error`,
      correlationId,
      metadata: {
        provider,
        model,
        errorCategory,
        ...logData.metadata,
      },
    });

    appLogger.aiSdk.error(`Provider error: ${provider}`, error, {
      ...logData,
      correlationId,
      userId: currentContext?.userId,
    });
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(key: string): {
    count: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    lastDuration: number;
  } | null {
    const durations = this.performanceMetrics.get(key);
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
   * Get cost summary by provider
   */
  public getCostSummary(): Record<AiProvider, number> {
    return Object.fromEntries(this.costTracker.entries()) as Record<AiProvider, number>;
  }

  /**
   * Get token usage summary by model
   */
  public getTokenUsageSummary(): Record<string, number> {
    return Object.fromEntries(this.tokenUsageTracker.entries());
  }

  /**
   * Get active operations count
   */
  public getActiveOperationsCount(): number {
    return this.activeOperations.size;
  }

  /**
   * Helper methods
   */
  private generateOperationId(provider: AiProvider, model: string, operation: AiSdkOperation): string {
    return `${provider}-${model}-${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateExecutionId(toolName: string, provider: AiProvider): string {
    return `${toolName}-${provider}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateCost(provider: AiProvider, model: string, tokenUsage: TokenUsage): CostInfo {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-3.5-turbo']; // Fallback
    
    const inputCost = (tokenUsage.promptTokens / 1000) * pricing.inputCostPer1k;
    const outputCost = (tokenUsage.completionTokens / 1000) * pricing.outputCostPer1k;
    const totalCost = inputCost + outputCost;

    return {
      inputCost,
      outputCost,
      totalCost,
      currency: pricing.currency,
      provider,
      model,
    };
  }

  private classifyProviderError(provider: AiProvider, error: Error): ErrorCategory {
    const errorMessage = error.message.toLowerCase();
    const errorCode = this.getErrorCode(error);

    // Rate limiting
    if (errorMessage.includes('rate limit') || errorCode === '429') {
      return ErrorCategory.RATE_LIMIT;
    }

    // Authentication/Authorization
    if (errorMessage.includes('unauthorized') || errorCode === '401') {
      return ErrorCategory.AUTHENTICATION;
    }
    if (errorMessage.includes('forbidden') || errorCode === '403') {
      return ErrorCategory.AUTHORIZATION;
    }

    // Validation
    if (errorMessage.includes('invalid') || errorCode === '400') {
      return ErrorCategory.VALIDATION;
    }

    // Timeout
    if (errorMessage.includes('timeout') || errorCode === '408') {
      return ErrorCategory.TIMEOUT;
    }

    // Provider-specific errors
    if (errorMessage.includes('model') || errorMessage.includes('completion')) {
      return ErrorCategory.AI_SDK;
    }

    return ErrorCategory.EXTERNAL_API;
  }

  private sanitizeToolParameters(params: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential', 'api_key'];

    for (const [key, value] of Object.entries(params)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 500) {
        sanitized[key] = value.substring(0, 500) + '... [TRUNCATED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private sanitizeRequestData(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ['api_key', 'authorization', 'token', 'messages'];

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (key === 'messages' && Array.isArray(value)) {
        // Log message count but not content for privacy
        sanitized[key] = `[${value.length} messages]`;
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private addPerformanceMetric(key: string, duration: number): void {
    if (!this.performanceMetrics.has(key)) {
      this.performanceMetrics.set(key, []);
    }

    const durations = this.performanceMetrics.get(key)!;
    durations.push(duration);

    // Keep only last 100 measurements
    if (durations.length > 100) {
      durations.shift();
    }
  }

  private addCostToTracker(provider: AiProvider, cost: number): void {
    const currentCost = this.costTracker.get(provider) || 0;
    this.costTracker.set(provider, currentCost + cost);
  }

  private addTokenUsage(model: string, tokens: number): void {
    const currentUsage = this.tokenUsageTracker.get(model) || 0;
    this.tokenUsageTracker.set(model, currentUsage + tokens);
  }

  /**
   * Safely extract error code from error object
   */
  private getErrorCode(error: Error): string | undefined {
    const errorWithCode = error as Error & { code?: string | number };
    if (errorWithCode.code !== undefined) {
      return String(errorWithCode.code);
    }
    return undefined;
  }

  /**
   * Safely extract error type from error object
   */
  private getErrorType(error: Error): string | undefined {
    const errorWithType = error as Error & { type?: string };
    return errorWithType.type;
  }
}

// Singleton instance
export const aiSdkLogger = AiSdkLogger.getInstance();

// Convenience functions
export const startAiOperation = (
  provider: AiProvider,
  model: string,
  operation: AiSdkOperation,
  metadata?: Record<string, unknown>
) => aiSdkLogger.startOperation(provider, model, operation, metadata);

export const endAiOperation = (
  operationId: string,
  result?: Parameters<typeof aiSdkLogger.endOperation>[1]
) => aiSdkLogger.endOperation(operationId, result);

export const logStreamingEvent = (
  operationId: string,
  state: StreamingState,
  data?: Parameters<typeof aiSdkLogger.logStreamingEvent>[2]
) => aiSdkLogger.logStreamingEvent(operationId, state, data);

export const logToolExecution = (
  toolName: string,
  provider: AiProvider,
  model: string,
  execution: Parameters<typeof aiSdkLogger.logToolExecution>[3]
) => aiSdkLogger.logToolExecution(toolName, provider, model, execution);

export const logProviderError = (
  provider: AiProvider,
  model: string,
  error: Error,
  context?: Parameters<typeof aiSdkLogger.logProviderError>[3]
) => aiSdkLogger.logProviderError(provider, model, error, context);

// Default export
export default aiSdkLogger; 