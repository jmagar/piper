import { 
  ChatService, 
  McpService,
  ConfigService,
  PromptService,
  DashboardService,
  HealthService,
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
  getMessages: ChatService.getApiChat,
  createMessage: ChatService.postApiChat,
  starMessage: ChatService.postApiChatMessagesStar,
  unstarMessage: ChatService.postApiChatMessagesUnstar,
  getUserConversations: ChatService.getApiChatConversations
};

export const mcpService = {
  getTools: McpService.getApiMcpTools,
  registerTool: McpService.postApiMcpTools,
  executeToolByName: McpService.postApiMcpToolsExecute,
  getServers: McpService.getApiMcpServers,
  registerServer: McpService.postApiMcpServers,
  getHealth: McpService.getApiMcpHealth,
  getConfig: McpService.getApiMcpConfig,
  updateConfig: McpService.putApiMcpConfig
};

// Replace the missing ToolsService with McpService methods for tools
export const toolsService = {
  getAvailableTools: McpService.getApiMcpTools,
  invokeTool: McpService.postApiMcpToolsExecute
};

export const configService = {
  getConfig: ConfigService.getApiConfig,
  updateConfig: ConfigService.putApiConfig
};

export const promptService = {
  enhancePrompt: PromptService.postApiPromptEnhance
};

export const dashboardService = {
  getStats: DashboardService.getApiDashboardStats
};

export const healthService = {
  getHealth: HealthService.getApiHealth
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
