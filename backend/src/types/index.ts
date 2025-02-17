import { Server } from 'socket.io';
import { BaseMessage } from '@langchain/core/messages';
import { Request } from 'express';

export interface TerminalServer {
    io: Server;
    cleanup: () => void;
}

export interface Agent {
    invoke: (
        input: { messages: BaseMessage[] }, 
        config?: { configurable?: { thread_id: string } }
    ) => Promise<{ messages: BaseMessage[] }>;
}

export interface ChatRequest extends Request {
    body: { message: string };
}

export interface ToolUsage {
    tool?: string;
    input?: string;
    observation?: string;
}

export type ServerState = 'initializing' | 'ready' | 'failed';
export type LogLevel = 'info' | 'error' | 'debug';

export interface LLMConfig {
    model_provider: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
}

export interface MCPServerConfig {
    command: string;
    args: string[];
    env?: Record<string, string>;
    port?: number;
    base_url?: string;
    retry?: {
        max_attempts?: number;
        initial_delay?: number;
        max_delay?: number;
        backoff_factor?: number;
    };
    health_check?: {
        interval?: number;
        timeout?: number;
        path?: string;
    };
}

export interface Config {
    llm: {
        model_provider: string;
        model: string;
        temperature?: number;
        max_tokens?: number;
    };
    mcp_servers: Record<string, MCPServerConfig>;
    example_queries?: string[];
}

export interface LogEntry {
    timestamp: string;
    level: 'info' | 'error' | 'debug';
    message: string;
}

export type {
    Session,
    OnlineStatus,
    UserStatus,
    TypingState,
    ToolResult,
    CacheOperations,
    MessageCache,
    ToolCache
} from './redis.js'; 