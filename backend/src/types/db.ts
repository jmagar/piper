import type { Prisma } from '@prisma/client';

// User Types
export interface UserPreferences {
    theme?: 'light' | 'dark';
    notifications?: boolean;
    language?: string;
    [key: string]: unknown;
}

export interface User {
    id: string;
    created_at: Date;
    updated_at: Date;
    email: string;
    name: string | null;
    preferences: UserPreferences | null;
}

// Chat Types
export interface ChatMessage {
    id: string;
    created_at: Date;
    updated_at: Date;
    role: 'user' | 'assistant';
    content: string;
    metadata: Record<string, unknown>;
    conversation_id: string;
    user_id: string | null;
}

export interface Conversation {
    id: string;
    created_at: Date;
    updated_at: Date;
    title: string | null;
    last_message_at: Date;
    user_id: string | null;
    messages: ChatMessage[];
}

// Tool Types
export interface ToolResult {
    id: string;
    created_at: Date;
    updated_at: Date;
    tool_name: string;
    input_hash: string;
    result: Prisma.JsonValue;
    expires_at: Date;
}

export interface ToolUsage {
    name: string;
    input: unknown;
    output: unknown;
    error?: string;
    duration: number;
} 