import { 
  ChatService, 
  McpService,
  ToolsService,
  AnalyticsService,
  RealtimeService,
  ConfigService,
  PromptService,
  PreviewService,
  OpenAPI,
  ApiError as GeneratedApiError
} from './generated';
import type { ApiError as CustomApiError } from './errors';
import { ApiError } from './errors';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100';

// Initialize API configuration
OpenAPI.BASE = API_BASE_URL;
OpenAPI.WITH_CREDENTIALS = false;

// Export service methods
export const chatService = {
  getMessages: ChatService.getMessages,
  createMessage: ChatService.createMessage,
  starMessage: ChatService.starMessage,
  unstarMessage: ChatService.unstarMessage,
  getThreadMessages: ChatService.getThreadMessages,
  editMessage: ChatService.editMessage,
  deleteMessage: ChatService.deleteMessage,
  getUserConversations: ChatService.getUserConversations,
  getChatStats: ChatService.getChatStats,
  addMessageReaction: ChatService.addMessageReaction,
  removeMessageReaction: ChatService.removeMessageReaction
};

export const mcpService = {
  getTools: McpService.getTools,
  registerTool: McpService.registerTool,
  getTool: McpService.getTool,
  updateTool: McpService.updateTool,
  deleteTool: McpService.deleteTool
};

export const toolsService = {
  getAvailableTools: ToolsService.getAvailableTools,
  invokeTool: ToolsService.invokeTool
};

export const analyticsService = {
  getMetrics: AnalyticsService.getMetrics
};

export const realtimeService = {
  getRealtimeStatus: RealtimeService.getRealtimeStatus,
  sendEvent: RealtimeService.sendEvent
};

export const configService = {
  getConfig: ConfigService.getConfig,
  updateConfig: ConfigService.updateConfig
};

export const promptService = {
  enhancePrompt: PromptService.enhancePrompt
};

export const previewService = {
  getLinkPreview: PreviewService.getLinkPreview
};

/**
 * Convert generated API errors to our custom ApiError type
 */
export function handleApiError(error: unknown): CustomApiError {
  if (error instanceof GeneratedApiError) {
    throw new ApiError(
      error.message ?? 'An unknown error occurred',
      error.status,
      error.body
    );
  }

  throw ApiError.fromError(error);
}

// Re-export all types
export * from './generated';
