/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Type guard to check if an error is an ApiError
   */
  static isApiError(error: unknown): error is ApiError {
    if (!(error instanceof ApiError)) return false;
    return true;
  }

  /**
   * Create an ApiError from an unknown error
   */
  static fromError(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    
    if (error instanceof Error) {
      return new ApiError(error.message, 500);
    }

    return new ApiError('An unknown error occurred', 500);
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