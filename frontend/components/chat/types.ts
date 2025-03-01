/**
 * Types for the chat component
 * 
 * These types are based on the existing message types in the project
 * but simplified for the refactored chat components.
 */

/**
 * Possible roles in a chat conversation
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Message content types
 */
export type MessageType = 'text' | 'code' | 'system' | 'file-list' | 'stream-chunk';

/**
 * Message sending and delivery status
 */
export type MessageStatus = 'sending' | 'streaming' | 'sent' | 'delivered' | 'error';

/**
 * Basic message data
 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  type?: MessageType;
  status?: MessageStatus;
}

/**
 * Message with extended metadata
 */
export interface ExtendedMessage extends Message {
  userId?: string;
  username?: string;
  conversationId?: string;
  parentId?: string;
  type: MessageType;
  status: MessageStatus;
  metadata?: {
    edited?: boolean;
    editedAt?: string;
    isPartial?: boolean;
    reactions?: Record<string, {
      count: number;
      users: {
        id: string;
        name: string;
      }[];
    }>;
    threadId?: string;
    hasThread?: boolean;
    replyCount?: number;
    [key: string]: unknown;
  };
}

/**
 * Typing indicator state
 */
export interface TypingIndicator {
  userId: string;
  username: string;
  timestamp: Date;
  isTyping: boolean;
}

/**
 * Conversation summary
 */
export interface Conversation {
  id: string;
  title?: string;
  lastMessageAt: string;
  messageCount: number;
  isArchived?: boolean;
} 