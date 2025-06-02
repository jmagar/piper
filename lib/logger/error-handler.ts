import { appLogger } from './index';
import { getCurrentCorrelationId, getCurrentContext } from './correlation';
import { ErrorCategory, ClassifiedError } from './types';

// Extended error interfaces for type safety
interface ErrorWithCode extends Error {
  code?: string | number;
  statusCode?: number;
  errno?: string | number;
  syscall?: string;
  hostname?: string;
  port?: number;
  address?: string;
}

interface ValidationError extends ErrorWithCode {
  errors?: unknown[];
}

interface PrismaError extends ErrorWithCode {
  meta?: unknown;
}

// Error patterns for classification
export interface ErrorPattern {
  category: ErrorCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  statusCode: number;
  keywords: string[];
  namePatterns?: RegExp[];
  messagePatterns?: RegExp[];
  codePatterns?: (string | number)[];
}

// Comprehensive error patterns database
export const ERROR_PATTERNS: ErrorPattern[] = [
  // Validation errors
  {
    category: ErrorCategory.VALIDATION,
    severity: 'low',
    retryable: false,
    statusCode: 400,
    keywords: ['validation', 'invalid', 'required', 'missing', 'format', 'schema'],
    namePatterns: [/validation/i, /invalid/i],
    messagePatterns: [/required/i, /invalid/i, /missing/i, /must be/i, /should be/i],
    codePatterns: ['VALIDATION_ERROR', 'INVALID_INPUT', 400]
  },
  
  // Authentication errors
  {
    category: ErrorCategory.AUTHENTICATION,
    severity: 'medium',
    retryable: false,
    statusCode: 401,
    keywords: ['authentication', 'unauthorized', 'login', 'token', 'credentials'],
    namePatterns: [/auth/i, /unauthorized/i],
    messagePatterns: [/unauthorized/i, /authentication/i, /invalid.*token/i, /expired.*token/i],
    codePatterns: ['AUTH_ERROR', 'UNAUTHORIZED', 401]
  },
  
  // Authorization errors
  {
    category: ErrorCategory.AUTHORIZATION,
    severity: 'medium',
    retryable: false,
    statusCode: 403,
    keywords: ['authorization', 'forbidden', 'permission', 'access', 'denied'],
    namePatterns: [/forbidden/i, /access/i],
    messagePatterns: [/forbidden/i, /permission/i, /access.*denied/i, /not.*allowed/i],
    codePatterns: ['AUTHORIZATION_ERROR', 'FORBIDDEN', 403]
  },
  
  // Not found errors
  {
    category: ErrorCategory.NOT_FOUND,
    severity: 'low',
    retryable: false,
    statusCode: 404,
    keywords: ['not found', 'missing', 'does not exist', '404'],
    namePatterns: [/notfound/i, /missing/i],
    messagePatterns: [/not.*found/i, /does.*not.*exist/i, /cannot.*find/i],
    codePatterns: ['NOT_FOUND', 'MISSING', 404]
  },
  
  // Timeout errors
  {
    category: ErrorCategory.TIMEOUT,
    severity: 'medium',
    retryable: true,
    statusCode: 408,
    keywords: ['timeout', 'timed out', 'deadline', 'timeout exceeded'],
    namePatterns: [/timeout/i, /deadline/i],
    messagePatterns: [/timeout/i, /timed.*out/i, /deadline.*exceeded/i],
    codePatterns: ['TIMEOUT', 'ETIMEDOUT', 408]
  },
  
  // Rate limit errors
  {
    category: ErrorCategory.RATE_LIMIT,
    severity: 'medium',
    retryable: true,
    statusCode: 429,
    keywords: ['rate limit', 'too many requests', 'quota', 'throttle'],
    namePatterns: [/ratelimit/i, /throttle/i],
    messagePatterns: [/rate.*limit/i, /too.*many.*requests/i, /quota.*exceeded/i],
    codePatterns: ['RATE_LIMIT', 'TOO_MANY_REQUESTS', 429]
  },
  
  // MCP protocol errors
  {
    category: ErrorCategory.MCP_PROTOCOL,
    severity: 'high',
    retryable: true,
    statusCode: 500,
    keywords: ['mcp', 'json-rpc', 'protocol', 'server', 'client'],
    namePatterns: [/mcp/i, /jsonrpc/i, /protocol/i],
    messagePatterns: [/mcp/i, /json-rpc/i, /protocol.*error/i, /server.*error/i],
    codePatterns: ['MCP_ERROR', 'JSON_RPC_ERROR', 'PROTOCOL_ERROR']
  },
  
  // AI SDK errors
  {
    category: ErrorCategory.AI_SDK,
    severity: 'high',
    retryable: true,
    statusCode: 500,
    keywords: ['ai', 'model', 'openai', 'anthropic', 'llm', 'completion'],
    namePatterns: [/ai/i, /model/i, /openai/i, /anthropic/i],
    messagePatterns: [/model.*error/i, /ai.*error/i, /completion.*failed/i, /token.*limit/i],
    codePatterns: ['AI_ERROR', 'MODEL_ERROR', 'COMPLETION_ERROR']
  },
  
  // Database errors
  {
    category: ErrorCategory.DATABASE,
    severity: 'critical',
    retryable: true,
    statusCode: 500,
    keywords: ['database', 'sql', 'prisma', 'connection', 'query'],
    namePatterns: [/database/i, /sql/i, /prisma/i, /connection/i],
    messagePatterns: [/database/i, /sql/i, /prisma/i, /connection.*failed/i, /query.*failed/i],
    codePatterns: ['DATABASE_ERROR', 'SQL_ERROR', 'CONNECTION_ERROR', 'ECONNREFUSED']
  },
  
  // External API errors
  {
    category: ErrorCategory.EXTERNAL_API,
    severity: 'medium',
    retryable: true,
    statusCode: 502,
    keywords: ['fetch', 'network', 'api', 'request', 'response'],
    namePatterns: [/fetch/i, /network/i, /api/i],
    messagePatterns: [/fetch.*failed/i, /network.*error/i, /api.*error/i, /service.*unavailable/i],
    codePatterns: ['FETCH_ERROR', 'NETWORK_ERROR', 'API_ERROR', 'ENOTFOUND', 'ECONNRESET']
  }
];

/**
 * Advanced error classifier with pattern matching
 */
export class ErrorClassifier {
  private static instance: ErrorClassifier;
  
  private constructor() {}
  
  public static getInstance(): ErrorClassifier {
    if (!ErrorClassifier.instance) {
      ErrorClassifier.instance = new ErrorClassifier();
    }
    return ErrorClassifier.instance;
  }
  
  /**
   * Classify an error using pattern matching
   */
  public classify(error: Error): ClassifiedError {
    const errorName = error.name.toLowerCase();
    const errorMessage = error.message.toLowerCase();
    const errorWithCode = error as ErrorWithCode;
    const errorCode = errorWithCode.code;
    const errorStatusCode = errorWithCode.statusCode;
    
    // Find matching pattern
    const matchedPattern = this.findMatchingPattern(error, errorName, errorMessage, errorCode);
    
    if (matchedPattern) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: errorCode,
        statusCode: errorStatusCode || matchedPattern.statusCode,
        category: matchedPattern.category,
        severity: matchedPattern.severity,
        retryable: matchedPattern.retryable,
        userFacing: true,
        details: this.extractErrorDetails(error),
      };
    }
    
    // Fallback classification
    return this.fallbackClassification(error);
  }
  
  /**
   * Find matching error pattern
   */
  private findMatchingPattern(
    error: Error,
    errorName: string,
    errorMessage: string,
    errorCode: string | number | undefined
  ): ErrorPattern | null {
    for (const pattern of ERROR_PATTERNS) {
      let score = 0;
      
      // Check keywords in message
      for (const keyword of pattern.keywords) {
        if (errorMessage.includes(keyword.toLowerCase())) {
          score += 2;
        }
      }
      
      // Check name patterns
      if (pattern.namePatterns) {
        for (const namePattern of pattern.namePatterns) {
          if (namePattern.test(errorName)) {
            score += 3;
          }
        }
      }
      
      // Check message patterns
      if (pattern.messagePatterns) {
        for (const messagePattern of pattern.messagePatterns) {
          if (messagePattern.test(errorMessage)) {
            score += 3;
          }
        }
      }
      
      // Check code patterns
      if (pattern.codePatterns && errorCode) {
        for (const codePattern of pattern.codePatterns) {
          if (errorCode === codePattern || errorCode.toString() === codePattern.toString()) {
            score += 4;
          }
        }
      }
      
      // Return pattern if we have a good match
      if (score >= 2) {
        return pattern;
      }
    }
    
    return null;
  }
  
  /**
   * Fallback classification for unmatched errors
   */
  private fallbackClassification(error: Error): ClassifiedError {
    const errorWithCode = error as ErrorWithCode;
    const statusCode = errorWithCode.statusCode || 500;
    
    // Determine category based on status code
    let category = ErrorCategory.UNKNOWN;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let retryable = false;
    
    if (statusCode >= 400 && statusCode < 500) {
      category = ErrorCategory.VALIDATION;
      severity = 'low';
      retryable = false;
    } else if (statusCode >= 500) {
      category = ErrorCategory.INTERNAL_SERVER;
      severity = 'high';
      retryable = true;
    }
    
          return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: errorWithCode.code,
        statusCode,
        category,
        severity,
        retryable,
        userFacing: true,
        details: this.extractErrorDetails(error),
      };
    }
  
    /**
     * Extract additional error details
     */
    private extractErrorDetails(error: Error): Record<string, unknown> {
      const details: Record<string, unknown> = {};
      const errorWithCode = error as ErrorWithCode;
      
      // Extract common error properties
      const errorProps: (keyof ErrorWithCode)[] = ['code', 'errno', 'syscall', 'hostname', 'port', 'address'];
      for (const prop of errorProps) {
        if (errorWithCode[prop] !== undefined) {
          details[prop] = errorWithCode[prop];
        }
      }
      
      // Extract specific error types
      if (error.name === 'ValidationError') {
        const validationError = error as ValidationError;
        if (validationError.errors) {
          details.validationErrors = validationError.errors;
        }
      }
      
      if (error.name === 'PrismaClientKnownRequestError') {
        const prismaError = error as PrismaError;
        details.prismaCode = prismaError.code;
        details.meta = prismaError.meta;
      }
      
      return details;
    }
  
  /**
   * Check if error should be retried
   */
  public shouldRetry(error: Error, attemptCount: number = 0, maxAttempts: number = 3): boolean {
    const classified = this.classify(error);
    
    if (!classified.retryable) {
      return false;
    }
    
    if (attemptCount >= maxAttempts) {
      return false;
    }
    
    // Don't retry critical database errors immediately
    if (classified.category === ErrorCategory.DATABASE && classified.severity === 'critical') {
      return attemptCount === 0; // Only retry once
    }
    
    return true;
  }
  
  /**
   * Calculate retry delay based on error type and attempt count
   */
  public getRetryDelay(error: Error, attemptCount: number): number {
    const classified = this.classify(error);
    
    // Base delay in milliseconds
    let baseDelay = 1000;
    
    // Adjust base delay based on error category
    switch (classified.category) {
      case ErrorCategory.RATE_LIMIT:
        baseDelay = 5000; // 5 seconds for rate limits
        break;
      case ErrorCategory.TIMEOUT:
        baseDelay = 2000; // 2 seconds for timeouts
        break;
      case ErrorCategory.EXTERNAL_API:
        baseDelay = 3000; // 3 seconds for external APIs
        break;
      case ErrorCategory.DATABASE:
        baseDelay = 1000; // 1 second for database
        break;
      default:
        baseDelay = 1000;
    }
    
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attemptCount);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }
}

/**
 * Error handler with comprehensive logging and analysis
 */
export class ErrorHandler {
  private classifier: ErrorClassifier;
  
  constructor() {
    this.classifier = ErrorClassifier.getInstance();
  }
  
  /**
   * Handle and log an error
   */
  public async handle(
    error: Error,
    context: {
      operation?: string;
      userId?: string;
      correlationId?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<ClassifiedError> {
    const classified = this.classifier.classify(error);
    const correlationId = context.correlationId || getCurrentCorrelationId();
    const currentContext = getCurrentContext();
    
    // Prepare log metadata
    const logMetadata = {
      errorDetails: {
        ...classified,
        correlationId,
        userId: context.userId || currentContext?.userId,
        operation: context.operation,
        timestamp: new Date().toISOString(),
      },
      context: context.metadata,
      source: 'error-handler',
    };
    
    // Log based on severity
    const fullLogMetadata = { ...logMetadata, error: error.message, stack: error.stack };
    switch (classified.severity) {
      case 'critical':
        appLogger.fatal('Critical error occurred', fullLogMetadata);
        break;
      case 'high':
        appLogger.error('High severity error occurred', fullLogMetadata);
        break;
      case 'medium':
        appLogger.warn('Medium severity error occurred', fullLogMetadata);
        break;
      case 'low':
        appLogger.info('Low severity error occurred', fullLogMetadata);
        break;
    }
    
    return classified;
  }
  
  /**
   * Create user-friendly error message
   */
  public createUserMessage(error: Error): string {
    const classified = this.classifier.classify(error);
    
    const userMessages = {
      [ErrorCategory.VALIDATION]: 'Please check your input and try again.',
      [ErrorCategory.AUTHENTICATION]: 'Please log in to access this resource.',
      [ErrorCategory.AUTHORIZATION]: 'You do not have permission to access this resource.',
      [ErrorCategory.NOT_FOUND]: 'The requested resource was not found.',
      [ErrorCategory.TIMEOUT]: 'The request timed out. Please try again.',
      [ErrorCategory.RATE_LIMIT]: 'Too many requests. Please try again later.',
      [ErrorCategory.MCP_PROTOCOL]: 'A protocol error occurred. Please try again.',
      [ErrorCategory.AI_SDK]: 'AI service is temporarily unavailable. Please try again.',
      [ErrorCategory.DATABASE]: 'Database error occurred. Please try again later.',
      [ErrorCategory.EXTERNAL_API]: 'External service is unavailable. Please try again.',
      [ErrorCategory.INTERNAL_SERVER]: 'An internal server error occurred. Please try again.',
      [ErrorCategory.UNKNOWN]: 'An unexpected error occurred. Please try again.',
    };
    
    return userMessages[classified.category] || userMessages[ErrorCategory.UNKNOWN];
  }
  
  /**
   * Check if error should be reported to monitoring
   */
  public shouldReport(error: Error): boolean {
    const classified = this.classifier.classify(error);
    
    // Always report critical and high severity errors
    if (classified.severity === 'critical' || classified.severity === 'high') {
      return true;
    }
    
    // Report medium severity errors except validation and not found
    if (classified.severity === 'medium' && 
        classified.category !== ErrorCategory.VALIDATION &&
        classified.category !== ErrorCategory.NOT_FOUND) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Generate error summary for monitoring
   */
  public generateErrorSummary(error: Error): {
    category: ErrorCategory;
    severity: string;
    message: string;
    retryable: boolean;
    correlationId?: string;
    timestamp: string;
  } {
    const classified = this.classifier.classify(error);
    const correlationId = getCurrentCorrelationId();
    
    return {
      category: classified.category,
      severity: classified.severity,
      message: error.message,
      retryable: classified.retryable,
      correlationId,
      timestamp: new Date().toISOString(),
    };
  }
}

// Singleton instances
export const errorClassifier = ErrorClassifier.getInstance();
export const errorHandler = new ErrorHandler();

// Convenience functions (classifyError removed to avoid duplicate export with middleware)
export const handleError = (error: Error, context?: Record<string, unknown>) => errorHandler.handle(error, context);
export const shouldRetryError = (error: Error, attemptCount?: number) => 
  errorClassifier.shouldRetry(error, attemptCount);
export const getRetryDelay = (error: Error, attemptCount: number) => 
  errorClassifier.getRetryDelay(error, attemptCount);

// Types and patterns are already exported when declared above
// (ERROR_PATTERNS, ErrorPattern)

// Default export
export default errorHandler; 