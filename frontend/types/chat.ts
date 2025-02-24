export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    userId?: string;
    username?: string;
    conversationId?: string;
    parentId?: string;
    type?: 'text' | 'code' | 'system';
    metadata?: Record<string, unknown>;
}

export interface ExtendedChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: string;
    updatedAt: string;
    userId?: string;
    username?: string;
    conversationId?: string;
    parentId?: string;
    type: 'text' | 'code' | 'system';
    status: 'sending' | 'sent' | 'delivered' | 'error';
    metadata: {
        edited?: boolean;
        editedAt?: Date;
        timestamp?: string | number;
        reactions?: Record<string, {
            count: number;
            users: {
                id: string;
                name: string;
            }[];
        }>;
        hasThread?: boolean;
        replyCount?: number;
        lastReplyAt?: string | Date;
        bookmarked?: boolean;
        threadSummary?: string;
        toolUsed?: {
            name: string;
            icon?: string;
            status: 'success' | 'error' | 'running';
        };
        [key: string]: unknown;
    };
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

export interface PaginatedMessages {
    messages: ExtendedChatMessage[];
    nextCursor: string | null;
    total: number;
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