/**
 * Basic chat message interface
 */
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    userId?: string;
    username?: string;
    conversationId?: string;
    parentId?: string;
    type?: 'text' | 'code' | 'system' | 'file-list' | 'stream-chunk';
    metadata?: Record<string, unknown>;
    id?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}

/**
 * Extended chat message with additional metadata and status
 */
export interface ExtendedChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: string;
    updatedAt?: string;
    userId?: string;
    username?: string;
    conversationId?: string;
    threadId?: string;
    parentId?: string;
    type: 'text' | 'code' | 'system' | 'file-list' | 'stream-chunk';
    status: 'sending' | 'streaming' | 'sent' | 'delivered' | 'error';
    metadata: {
        edited?: boolean;
        editedAt?: string | Date;
        timestamp?: string | number;
        streamStatus?: 'streaming' | 'complete' | 'error';
        streamId?: string;
        streamIndex?: number;
        isPartial?: boolean;
        reaction?: 'up' | 'down';
        starred?: boolean;
        streaming?: boolean;
        streamComplete?: boolean;
        streamEndTime?: string;
        tools?: Array<{
            name: string;
            icon?: string;
            description?: string;
            status?: 'success' | 'error' | 'running';
        }>;
        error?: string;
        errorTimestamp?: string;
        conversationId?: string;
        [key: string]: unknown;
    };
}

/**
 * Chat conversation interface
 */
export interface ChatConversation {
    id: string;
    title: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    userId: string;
    metadata?: {
        messageCount?: number;
        userMessageCount?: number;
        assistantMessageCount?: number;
        lastMessageAt?: string | Date;
        lastMessagePreview?: string;
        pinned?: boolean;
        archived?: boolean;
        [key: string]: unknown;
    };
}

/**
 * Server to client events for Socket.IO
 */
export interface ServerToClientEvents {
    'message:new': (message: ExtendedChatMessage) => void;
    'message:update': (message: ExtendedChatMessage) => void;
    'message:chunk': (data: { messageId: string; chunk: string }) => void;
    'message:error': (data: { messageId: string; error: string }) => void;
    'message:complete': (data: { messageId: string; metadata?: Record<string, unknown> }) => void;
    'user:typing': (user: { userId: string; username: string }) => void;
    'user:stop_typing': (user: { userId: string; username: string }) => void;
}

/**
 * Client to server events for Socket.IO
 */
export interface ClientToServerEvents {
    'message:sent': (message: ExtendedChatMessage, callback: (response: { error?: string; message?: ExtendedChatMessage }) => void) => void;
    'message:updated': (message: ExtendedChatMessage) => void;
    'user:typing': () => void;
    'user:stop_typing': () => void;
}

/**
 * Paginated messages response
 */
export interface PaginatedMessages {
    messages: ExtendedChatMessage[];
    nextCursor: string | null;
    total: number;
}

export interface TypingIndicator {
    userId: string;
    username: string;
    timestamp: Date;
}

export interface MessageReaction {
    emoji: string;
    count: number;
    users: {
        id: string;
        name: string;
    }[];
}

export interface MessageBookmark {
    id: string;
    note?: string;
    tags: string[];
    created_at: Date;
}

export interface Conversation {
    id: string;
    title?: string;
    summary?: string;
    lastMessageAt: Date;
    isArchived: boolean;
    stats?: {
        messageCount: number;
        userMessageCount: number;
        botMessageCount: number;
        averageResponseTime: number;
        toolUsageCount: number;
    };
}

export interface UserStats {
    totalConversations: number;
    totalMessages: number;
    totalStarred: number;
    averageResponseLength: number;
    lastActive: Date;
}
