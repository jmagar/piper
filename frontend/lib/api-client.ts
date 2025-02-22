import { ChatAPI } from './generated';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100';

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

// Re-export all types
export * from './generated';
