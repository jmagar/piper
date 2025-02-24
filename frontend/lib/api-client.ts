import { ChatAPI } from './generated';
import type { CoreApiError } from './generated';
import { ApiError } from './errors';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100';

// Initialize API client with proper configuration
const api = new ChatAPI({
    BASE: API_BASE_URL,
    WITH_CREDENTIALS: false,
});

// Export service instances
export const chatService = api.chat;
export const mcpService = api.mcp;
export const toolsService = api.tools;
export const analyticsService = api.analytics;
export const realtimeService = api.realtime;
export const configService = api.config;
export const promptService = api.prompt;
export const previewService = api.preview;

/**
 * Convert generated API errors to our custom ApiError type
 */
export function handleApiError(error: unknown): never {
  if ((error as CoreApiError)?.body) {
    const apiError = error as CoreApiError;
    throw new ApiError(
      apiError.body?.message ?? 'An unknown error occurred',
      apiError.status,
      apiError.body
    );
  }

  throw ApiError.fromError(error);
}

// Re-export all types
export * from './generated';
