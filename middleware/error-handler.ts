import { NextRequest, NextResponse } from 'next/server';
// import { appLogger } from '@/lib/logger'; // Now unused
import { getCurrentCorrelationId /*, getCurrentContext*/ } from '@/lib/logger/correlation'; // getCurrentContext is unused
import { 
  ErrorCategory, 
  ClassifiedError, 
  ErrorHandlingMiddlewareConfig 
} from '@/lib/logger/types';

// HTTP status codes for different error types
export const HTTP_STATUS_CODES = {
  [ErrorCategory.VALIDATION]: 400,
  [ErrorCategory.AUTHENTICATION]: 401,
  [ErrorCategory.AUTHORIZATION]: 403,
  [ErrorCategory.NOT_FOUND]: 404,
  [ErrorCategory.TIMEOUT]: 408,
  [ErrorCategory.RATE_LIMIT]: 429,
  [ErrorCategory.MCP_PROTOCOL]: 500,
  [ErrorCategory.AI_SDK]: 500,
  [ErrorCategory.DATABASE]: 500,
  [ErrorCategory.EXTERNAL_API]: 502,
  [ErrorCategory.INTERNAL_SERVER]: 500,
  [ErrorCategory.UNKNOWN]: 500,
} as const;

// Default configuration for error handling middleware
export const DEFAULT_ERROR_CONFIG: ErrorHandlingMiddlewareConfig = {
  enableStackTrace: process.env.NODE_ENV === 'development',
  enableErrorDetails: process.env.NODE_ENV === 'development',
  enableUserFriendlyMessages: true,
  logUnhandledErrors: true,
  enableErrorClassification: true,
  enableRetryInfo: true,
};

// User-friendly error messages for different categories
export const USER_FRIENDLY_MESSAGES = {
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
} as const;

/**
 * Custom error class with additional metadata
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly category: ErrorCategory;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly retryable: boolean;
  public readonly userFacing: boolean;
  public readonly details?: Record<string, unknown>;
  public readonly correlationId?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    options: {
      severity?: 'low' | 'medium' | 'high' | 'critical';
      retryable?: boolean;
      userFacing?: boolean;
      details?: Record<string, unknown>;
      correlationId?: string;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.category = category;
    this.severity = options.severity || 'medium';
    this.retryable = options.retryable || false;
    this.userFacing = options.userFacing || true;
    this.details = options.details;
    this.correlationId = options.correlationId || getCurrentCorrelationId();

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Classify an error based on its properties
 */
export function classifyError(error: Error): ClassifiedError {
  let category = ErrorCategory.UNKNOWN;
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  let retryable = false;
  const userFacing = true;
  let statusCode = 500;

  // Check if it's already an AppError
  if (error instanceof AppError) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      category: error.category,
      severity: error.severity,
      retryable: error.retryable,
      userFacing: error.userFacing,
      details: error.details,
    };
  }

  // Classify based on error name and message
  const errorName = error.name.toLowerCase();
  const errorMessage = error.message.toLowerCase();

  // Validation errors
  if (errorName.includes('validation') || 
      errorMessage.includes('validation') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('required')) {
    category = ErrorCategory.VALIDATION;
    statusCode = 400;
    severity = 'low';
    retryable = false;
  }
  // Authentication errors
  else if (errorName.includes('auth') || 
           errorMessage.includes('unauthorized') ||
           errorMessage.includes('authentication')) {
    category = ErrorCategory.AUTHENTICATION;
    statusCode = 401;
    severity = 'medium';
    retryable = false;
  }
  // Authorization errors
  else if (errorMessage.includes('forbidden') ||
           errorMessage.includes('permission') ||
           errorMessage.includes('authorization')) {
    category = ErrorCategory.AUTHORIZATION;
    statusCode = 403;
    severity = 'medium';
    retryable = false;
  }
  // Not found errors
  else if (errorName.includes('notfound') ||
           errorMessage.includes('not found') ||
           errorMessage.includes('does not exist')) {
    category = ErrorCategory.NOT_FOUND;
    statusCode = 404;
    severity = 'low';
    retryable = false;
  }
  // Timeout errors
  else if (errorName.includes('timeout') ||
           errorMessage.includes('timeout') ||
           errorMessage.includes('timed out')) {
    category = ErrorCategory.TIMEOUT;
    statusCode = 408;
    severity = 'medium';
    retryable = true;
  }
  // Rate limit errors
  else if (errorMessage.includes('rate limit') ||
           errorMessage.includes('too many requests')) {
    category = ErrorCategory.RATE_LIMIT;
    statusCode = 429;
    severity = 'medium';
    retryable = true;
  }
  // MCP protocol errors
  else if (errorMessage.includes('mcp') ||
           errorMessage.includes('json-rpc') ||
           errorMessage.includes('protocol')) {
    category = ErrorCategory.MCP_PROTOCOL;
    statusCode = 500;
    severity = 'high';
    retryable = true;
  }
  // AI SDK errors
  else if (errorMessage.includes('ai') ||
           errorMessage.includes('model') ||
           errorMessage.includes('openai') ||
           errorMessage.includes('anthropic')) {
    category = ErrorCategory.AI_SDK;
    statusCode = 500;
    severity = 'high';
    retryable = true;
  }
  // Database errors
  else if (errorMessage.includes('database') ||
           errorMessage.includes('sql') ||
           errorMessage.includes('prisma') ||
           errorMessage.includes('connection')) {
    category = ErrorCategory.DATABASE;
    statusCode = 500;
    severity = 'critical';
    retryable = true;
  }
  // External API errors
  else if (errorMessage.includes('fetch') ||
           errorMessage.includes('network') ||
           errorMessage.includes('api')) {
    category = ErrorCategory.EXTERNAL_API;
    statusCode = 502;
    severity = 'medium';
    retryable = true;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: 'code' in error ? String((error as {code: unknown}).code) : undefined,
    statusCode: 'statusCode' in error ? Number((error as {statusCode: unknown}).statusCode) : statusCode,
    category,
    severity,
    retryable,
    userFacing,
  };
}

/**
 * Generate a standardized error response
 */
export function createErrorResponse(
  error: Error | ClassifiedError,
  config: ErrorHandlingMiddlewareConfig = DEFAULT_ERROR_CONFIG
): {
  error: {
    message: string;
    code?: string | number;
    category?: ErrorCategory;
    correlationId?: string;
    retryable?: boolean;
    details?: Record<string, unknown>;
    stack?: string;
  };
  statusCode: number;
} {
  const classified = error instanceof Error ? classifyError(error) : error;
  const correlationId = getCurrentCorrelationId();

  const response = {
    error: {
      message: config.enableUserFriendlyMessages 
        ? USER_FRIENDLY_MESSAGES[classified.category] || classified.message
        : classified.message,
      correlationId,
    } as {
      message: string;
      code?: string | number;
      category?: ErrorCategory;
      correlationId?: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
      stack?: string;
    },
    statusCode: classified.statusCode || 500,
  };

  // Add optional fields based on configuration
  if (config.enableErrorDetails && classified.details) {
    response.error.details = classified.details;
  }

  if (config.enableErrorClassification) {
    response.error.category = classified.category;
    response.error.code = classified.code;
  }

  if (config.enableRetryInfo) {
    response.error.retryable = classified.retryable;
  }

  if (config.enableStackTrace && classified.stack) {
    response.error.stack = classified.stack;
  }

  return response;
}

/**
 * Next.js error boundary handler
 */
export function nextErrorHandler(
  error: Error,
  request: NextRequest,
  config: Partial<ErrorHandlingMiddlewareConfig> = {}
): NextResponse {
  const finalConfig = { ...DEFAULT_ERROR_CONFIG, ...config };
  const correlationId = getCurrentCorrelationId();
  const classified = classifyError(error);

  // Log the error if enabled
  if (finalConfig.logUnhandledErrors) {
    const errorData = {
      ...classified,
      correlationId,
      request: {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      },
      timestamp: new Date().toISOString(),
    };

    const logLevel = classified.severity === 'critical' ? 'fatal' : 'error';
    // Use console for middleware context logging
    const consoleLogLevel = logLevel === 'fatal' ? 'error' : logLevel;
    console[consoleLogLevel]('[Middleware] Unhandled error in Next.js middleware', {
      error,
      errorDetails: errorData,
      source: 'next-error-handler',
    });
  }

  // Create standardized response
  const errorResponse = createErrorResponse(classified, finalConfig);

  return NextResponse.json(errorResponse.error, {
    status: errorResponse.statusCode,
    headers: {
      'x-correlation-id': correlationId || '',
    },
  });
}

/**
 * Higher-order function to wrap handlers with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => unknown>(
  handler: T,
  config: Partial<ErrorHandlingMiddlewareConfig> = {}
): T {
  const finalConfig = { ...DEFAULT_ERROR_CONFIG, ...config };

  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      const correlationId = getCurrentCorrelationId();
      const classified = classifyError(error as Error);

      // Log the error
      if (finalConfig.logUnhandledErrors) {
        const errorData = {
          ...classified,
          correlationId,
          timestamp: new Date().toISOString(),
        };

        // Use console for middleware context logging
        console.error('[Middleware] Error in wrapped handler', {
          error: error as Error,
          errorDetails: errorData,
          source: 'error-handler-wrapper',
        });
      }

      // Re-throw the error for the caller to handle
      throw error;
    }
  }) as T;
}

/**
 * Process unhandled Promise rejections
 */
export function setupUnhandledRejectionHandler(
  config: Partial<ErrorHandlingMiddlewareConfig> = {}
): void {
  const finalConfig = { ...DEFAULT_ERROR_CONFIG, ...config };

  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    const classified = classifyError(error);

    if (finalConfig.logUnhandledErrors) {
      // Use console for middleware context logging
      console.error('[Middleware] Unhandled Promise rejection', {
        error,
        errorDetails: {
          ...classified,
          promise: promise.toString(),
          timestamp: new Date().toISOString(),
        },
        source: 'unhandled-rejection-handler',
      });
    }

    // In production, you might want to gracefully shutdown
    if (process.env.NODE_ENV === 'production' && classified.severity === 'critical') {
      console.error('Critical unhandled rejection, shutting down...');
      process.exit(1);
    }
  });
}

/**
 * Process uncaught exceptions
 */
export function setupUncaughtExceptionHandler(
  config: Partial<ErrorHandlingMiddlewareConfig> = {}
): void {
  const finalConfig = { ...DEFAULT_ERROR_CONFIG, ...config };

  process.on('uncaughtException', (error: Error) => {
    const classified = classifyError(error);

    if (finalConfig.logUnhandledErrors) {
      // Use console for middleware context logging
      console.error('[Middleware] Uncaught exception', {
        error,
        errorDetails: {
          ...classified,
          timestamp: new Date().toISOString(),
        },
        source: 'uncaught-exception-handler',
      });
    }

    // Uncaught exceptions are serious, always exit
    console.error('Uncaught exception, shutting down...');
    process.exit(1);
  });
}

/**
 * Initialize global error handlers
 */
export function initializeGlobalErrorHandlers(
  config: Partial<ErrorHandlingMiddlewareConfig> = {}
): void {
  setupUnhandledRejectionHandler(config);
  setupUncaughtExceptionHandler(config);
  
  // Use console for middleware context logging
  console.info('[Middleware] Global error handlers initialized', {
    config,
    source: 'global-error-handler',
  });
}

/**
 * Create a configurable error handling middleware factory
 */
export function createErrorHandlingMiddleware(
  // config: Partial<ErrorHandlingMiddlewareConfig> = {} // Unused
) {
  // return expressErrorHandlingMiddleware(config);
}

// Export utility functions and constants (AppError is already exported above)
// classifyError is exported at its definition
// createErrorResponse is exported at its definition
// HTTP_STATUS_CODES is exported at its definition
// USER_FRIENDLY_MESSAGES is exported at its definition

// All exports are already handled above when declared
// (AppError, classifyError, createErrorResponse, HTTP_STATUS_CODES, and USER_FRIENDLY_MESSAGES) 