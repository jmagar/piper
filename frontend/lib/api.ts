import type { ExtendedChatMessage } from '@/types/chat';

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

export interface PaginatedMessages {
    messages: ExtendedChatMessage[];
    nextCursor: string | null;
    total: number;
}

export interface MessageReaction {
    emoji: string;
    count: number;
    users: { id: string; name: string }[];
}

export interface MessageBookmark {
    id: string;
    note?: string;
    tags: string[];
    created_at: Date;
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorText = await response.text();
        try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.error || 'API request failed');
        } catch {
            throw new Error(errorText || 'API request failed');
        }
    }
    return response.json();
}

export async function sendMessage(params: {
    message: string;
    conversationId?: string;
    userId: string;
}): Promise<{ userMessage: ExtendedChatMessage; assistantMessage: ExtendedChatMessage }> {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            content: params.message,
            userId: params.userId,
            username: 'admin', // Default username
            conversationId: params.conversationId,
            type: 'text',
            role: 'user',
            timestamp: new Date().toISOString(),
            metadata: {}
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
    }

    return response.json();
}

export async function getMessages(params: {
    conversationId?: string;
    cursor?: string;
    limit?: number;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    threadId?: string;
}): Promise<PaginatedMessages> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            if (value instanceof Date) {
                searchParams.append(key, value.toISOString());
            } else {
                searchParams.append(key, String(value));
            }
        }
    });
        
    const response = await fetch(`/api/chat/messages?${searchParams.toString()}`);
    return handleResponse<PaginatedMessages>(response);
}

export async function updateMessage(messageId: string, content: string): Promise<ExtendedChatMessage> {
    const response = await fetch(`/api/chat/${messageId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
    });

    return handleResponse<ExtendedChatMessage>(response);
}

export async function addReaction(
    messageId: string,
    userId: string,
    emoji: string
): Promise<{ reactions: Record<string, MessageReaction> }> {
    const response = await fetch(`/api/chat/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji, userId, action: 'add' }),
    });

    return handleResponse<{ reactions: Record<string, MessageReaction> }>(response);
}

export async function removeReaction(
    messageId: string,
    userId: string,
    emoji: string
): Promise<{ reactions: Record<string, MessageReaction> }> {
    const response = await fetch(`/api/chat/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji, userId, action: 'remove' }),
    });

    return handleResponse<{ reactions: Record<string, MessageReaction> }>(response);
}

// Keep batch operation for bulk updates
export async function updateReactionsBatch(
    messageId: string,
    userId: string,
    reactions: string[]
): Promise<{ reactions: Record<string, MessageReaction> }> {
    const response = await fetch('/api/chat/messages/reactions/batch', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId, userId, reactions }),
    });

    return handleResponse<{ reactions: Record<string, MessageReaction> }>(response);
}

export async function bookmarkMessage(
    messageId: string,
    note?: string,
    tags?: string[]
): Promise<void> {
    const response = await fetch(`/api/chat/star`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId, note, tags }),
    });

    if (!response.ok) {
        throw new Error('Failed to bookmark message');
    }
}

export async function exportConversation(
    conversationId: string,
    format: 'json' | 'txt' = 'json'
): Promise<Blob> {
    const response = await fetch(`/api/chat/conversations/${conversationId}/export?format=${format}`);
    return response.blob();
}

export async function deleteMessage(messageId: string): Promise<void> {
    const response = await fetch(`/api/chat/${messageId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error('Failed to delete message');
    }
}

export async function starMessage(
    messageId: string,
    userId: string,
    note?: string
): Promise<void> {
    const response = await fetch('/api/chat/messages/star', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId, userId, note }),
    });

    if (!response.ok) {
        throw new Error('Failed to star message');
    }
}

export async function unstarMessage(
    messageId: string,
    userId: string
): Promise<void> {
    const response = await fetch('/api/chat/messages/unstar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId, userId }),
    });

    if (!response.ok) {
        throw new Error('Failed to unstar message');
    }
} 