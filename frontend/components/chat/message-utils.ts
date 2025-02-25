import type { ExtendedChatMessage } from '@/types/chat';

export function getMessageTimestamp(message: ExtendedChatMessage): Date {
    const timestamp = message.createdAt ?? message.metadata?.timestamp;
    
    if (timestamp === undefined || timestamp === null) {
        globalThis.console.warn('No timestamp found for message:', message);
        return new Date();
    }
    
    try {
        return typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    } catch (err) {
        globalThis.console.error('Failed to parse message timestamp:', err);
        return new Date();
    }
}

export function formatMessageTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

export const DEFAULT_USER = {
    id: 'test-user-1',
    name: 'Test User',
    email: 'test@example.com'
} as const;