import { ApiError } from './errors';
import { chatService, mcpService, toolsService } from './api-client';
import type { Tool } from './generated';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Checks if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  // Network errors
  if (error instanceof TypeError && error.message.includes('network')) {
    return true;
  }

  // Timeout errors
  if (error instanceof Error && error.message.includes('timeout')) {
    return true;
  }

  // Server errors (500+)
  if (error instanceof ApiError && error.status && error.status >= 500) {
    return true;
  }

  return false;
}

/**
 * Wraps an async operation with retry logic
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = MAX_RETRIES,
    retryDelay = RETRY_DELAY,
    onRetry
  } = options;

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (!isRetryableError(error) || attempt === maxRetries) {
        throw lastError;
      }

      onRetry?.(lastError, attempt);
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

/**
 * Wrapper for MCP service with better error handling
 */
export const mcp = {
  /**
   * Get list of available tools
   */
  async getTools(options?: RetryOptions): Promise<Tool[]> {
    return withRetry(
      () => mcpService.getTools(),
      options
    );
  },

  /**
   * Get details of a specific tool
   */
  async getTool(toolId: string, options?: RetryOptions): Promise<Tool> {
    return withRetry(
      () => mcpService.getTool({ toolId }),
      options
    );
  },

  /**
   * Execute a tool with retry logic
   */
  async invokeTool(
    toolId: string,
    parameters: Record<string, unknown>,
    options?: RetryOptions
  ) {
    return withRetry(
      () => toolsService.invokeTool({
        toolId,
        requestBody: { parameters }
      }),
      {
        ...options,
        onRetry: (error, attempt) => {
          console.warn(
            `Tool execution failed (attempt ${attempt}/${options?.maxRetries || MAX_RETRIES}):`,
            error
          );
          options?.onRetry?.(error, attempt);
        }
      }
    );
  }
};

/**
 * Wrapper for chat service with better error handling
 */
export const chat = {
  /**
   * Send a message with retry logic
   */
  async createMessage(
    content: string,
    userId: string,
    username: string,
    options?: RetryOptions
  ) {
    return withRetry(
      () => chatService.createMessage({
        requestBody: {
          content,
          userId,
          username
        }
      }),
      {
        ...options,
        onRetry: (error, attempt) => {
          console.warn(
            `Message send failed (attempt ${attempt}/${options?.maxRetries || MAX_RETRIES}):`,
            error
          );
          options?.onRetry?.(error, attempt);
        }
      }
    );
  },

  /**
   * Get messages for a conversation with retry logic
   */
  async getMessages(
    conversationId: string,
    cursor?: string,
    limit = 20,
    options?: RetryOptions
  ) {
    return withRetry(
      () => chatService.getMessages({
        conversationId,
        cursor,
        limit
      }),
      options
    );
  }
};

// Export wrapped services
export const api = {
  mcp,
  chat
};