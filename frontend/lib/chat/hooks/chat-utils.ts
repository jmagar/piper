/**
 * Shared utilities for chat hooks
 */

import { ExtendedChatMessage } from '@/types/chat';

/**
 * Create a base message object with common properties
 */
export function createBaseMessage(
  id: string,
  role: 'user' | 'assistant' | 'system',
  content: string, 
  status: 'sending' | 'streaming' | 'sent' | 'delivered' | 'error',
  type: 'text' | 'code' | 'system' | 'file-list' | 'stream-chunk' = 'text'
): ExtendedChatMessage {
  return {
    id,
    role,
    content,
    status,
    createdAt: new Date().toISOString(),
    type,
    metadata: {}
  };
}

/**
 * Safely add optional properties to a message
 */
export function addMessageProperties(
  message: ExtendedChatMessage,
  conversationId?: string | null,
  threadId?: string | null
): ExtendedChatMessage {
  const updatedMessage = { ...message };
  
  if (conversationId) updatedMessage.conversationId = conversationId;
  if (threadId) updatedMessage.threadId = threadId;
  
  return updatedMessage;
}

/**
 * Format error message from any error object
 */
export function formatErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return 'An unknown error occurred';
}

/**
 * Log socket events for debugging
 */
export function debugLog(prefix: string, ...args: any[]): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${prefix}]`, ...args);
  }
} 