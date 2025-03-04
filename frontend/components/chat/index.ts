/**
 * Chat Component Exports
 * This file provides centralized exports for all chat-related components
 */

'use client';

// Export components from providers directory
export { ChatProvider } from './providers/chat-provider';

// Export main layout component
export { ChatLayout } from './chat-layout';

// Export UI components
export { ChatDebug } from './chat-debug';

// Messages components
export { ChatMessagesList } from './messages/chat-messages-list';
export { ChatMessage } from './messages/chat-message';
export { MessageRenderer } from './messages/message-renderer';

// Input components
export { ChatInput } from './input/chat-input';

// Re-export chat hooks for convenience
export { useChatState } from '@/lib/chat/hooks/use-chat-state';
export { useChatMessages } from '@/lib/chat/hooks/use-chat-messages';
export { useChatStreaming } from '@/lib/chat/hooks/use-chat-streaming';
export { useSocketHandlers } from '@/lib/chat/hooks/use-socket-handlers';

// Re-export utilities
export { traceMessage, clearTraces, getAllTraces, getMessageTraces } from '@/lib/chat/utils/trace-logger';
export { validateMessage, messageDeduplicator } from '@/lib/chat/utils/message-processor'; 