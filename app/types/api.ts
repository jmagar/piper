// Consolidated API types - replaces scattered type definitions in API routes

// MCP Config API Types (from app/api/mcp-config/route.ts)
export interface MCPTransportSSE {
  type: 'sse' | 'http';
  url: string;
  headers?: Record<string, string>;
}

export interface MCPTransportStdio {
  type: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export type MCPTransport = MCPTransportSSE | MCPTransportStdio;

export interface MCPServerConfigFromUI {
  id: string; 
  name: string; 
  displayName?: string;
  transport: MCPTransport;
  enabled: boolean;
}

// Config.json storage structure
export interface StoredMCPServerEntry {
  command?: string; // For stdio
  args?: string[]; // For stdio
  env?: Record<string, string>; // For stdio
  cwd?: string; // For stdio
  url?: string; // For sse/http
  headers?: Record<string, string>; // For sse/http
  transportType?: 'sse' | 'http' | 'stdio'; // Explicit transport type
  disabled?: boolean; // To allow disabling from config
  displayName?: string; // User-friendly name, can be stored
  [key: string]: unknown; // Allow other properties
}

export interface PiperConfig {
  mcpServers: Record<string, StoredMCPServerEntry>;
  // other config properties
}

// Chat API Types
export interface MessageInput {
  role: "user" | "assistant";
  content: string;
}

export interface CreateChatRequest {
  initialMessage?: MessageInput;
  agentId?: string;
  model?: string;
  systemPrompt?: string;
}

// Tool Types
export interface ToolAvailableResponse {
  available: string[];
}

// Model Types
export interface SimplifiedModel {
  id: string;
  name: string;
  description: string;
  context_length: number | null;
  providerId: string;
}

// Developer Tools Types
export interface DeveloperTool {
  id: string;
  name: string;
  icon: string;
  description: string;
  envKeys: string[];
  connected: boolean;
  maskedKey: string | null;
  sampleEnv: string;
}

export interface DeveloperToolsResponse {
  tools: DeveloperTool[];
}

// File API Types
export interface FileListItem {
  name: string;
  type: 'directory' | 'file' | 'inaccessible';
  size?: number;
  lastModified?: string;
  relativePath: string;
  error?: string;
}

export interface FileListResponse {
  path: string;
  items: FileListItem[];
}

// Common API Response Types
export interface ApiError {
  error: string;
  details?: string;
  errors?: unknown;
}

export interface ApiSuccess<T = unknown> {
  message?: string;
  data?: T;
}

// Rate Limiting Types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
} 