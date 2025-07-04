// Re-export consolidated MCP types from centralized location
export * from '@/app/types/mcp';

// Also export the import path for backwards compatibility during transition
export type { McpServerInfo } from '@/app/api/mcp/servers/route';
export type { MCPServerConfig } from '@/lib/mcp/config-watcher'; 