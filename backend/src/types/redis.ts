import type { ChatMessage } from './db.js';

// Session Types
export interface Session {
    token: string;
    userId: string;
    lastActive: string;
    permissions: string[];
}

// Online Status Types
export type OnlineStatus = 'online' | 'away' | 'offline';

export interface UserStatus {
    status: OnlineStatus;
    lastSeen: string;
}

// Typing Indicator Types
export interface TypingState {
    isTyping: boolean;
    timestamp: number;
}

// Tool Result Types
export interface ToolResult {
    result: unknown;
    timestamp: string;
}

// Cache Types
export interface CacheOperations {
    set<T>(key: string, value: T, ttl: number): Promise<void>;
    get<T>(key: string): Promise<T | null>;
    delete(key: string): Promise<void>;
}

// Message Cache Types
export interface MessageCache {
    cacheConversationMessages(conversationId: string, messages: ChatMessage[]): Promise<void>;
    getCachedMessages(conversationId: string): Promise<ChatMessage[] | null>;
}

// Tool Cache Types
export interface ToolCache {
    cacheToolResult(toolName: string, input: string, result: unknown): Promise<void>;
    getCachedToolResult(toolName: string, input: string): Promise<unknown | null>;
} 