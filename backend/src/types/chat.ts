export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ExtendedChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string | Date;
    status: 'sending' | 'sent' | 'error';
    metadata?: {
        edited?: boolean;
        editedAt?: Date;
        username?: string;
        type?: 'text' | 'code' | 'system';
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
        [key: string]: unknown;
    };
}

export interface TypingIndicator {
    userId: string;
    username: string;
    timestamp: Date;
} 