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
}

export interface Config {
    llm: LLMConfig;
    example_queries?: string[];
    mcp_servers: {
        [key: string]: MCPServerConfig;
    }
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