import type { ApiError as CoreApiError } from './generated';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Type guard to check if an error is an ApiError
   */
  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }

  /**
   * Create an ApiError from an unknown error
   */
  static fromError(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    
    if (error instanceof Error) {
      return new ApiError(error.message);
    }

    return new ApiError('An unknown error occurred');
  }
}

/**
 * Type for API error responses
 */
export interface ApiErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export class McpError extends Error {
  constructor(
    message: string,
    public readonly serverId?: string,
    public readonly toolName?: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'McpError';
  }

  static isMcpError(error: unknown): error is McpError {
    return error instanceof McpError;
  }
}

export function handleApiError(error: unknown): ApiError {
  if (ApiError.isApiError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError('An unknown error occurred');
}

export function handleMcpError(error: unknown, serverId?: string, toolName?: string): McpError {
  if (McpError.isMcpError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new McpError(error.message, serverId, toolName);
  }

  return new McpError('An unknown error occurred', serverId, toolName);
}

export function isServerError(error: unknown): boolean {
  if (ApiError.isApiError(error)) {
    return error.status === undefined || error.status >= 500;
  }
  return false;
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && error.message.includes('network');
}

export function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('timeout');
}

export function shouldRetry(error: unknown): boolean {
  return isServerError(error) || isNetworkError(error) || isTimeoutError(error);
} 