import type { ServerToClientEvents, ClientToServerEvents } from '../socket';
import type { Socket as SocketIOSocket } from 'socket.io-client';

/**
 * Chat message type
 */
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  createdAt: string;
  updatedAt?: string;
  userId?: string;
  username?: string;
  conversationId?: string;
  parentId?: string;
  type: 'text' | 'code' | 'system' | 'file-list' | 'stream-chunk';
  status: 'sending' | 'streaming' | 'sent' | 'delivered' | 'error';
  metadata?: Record<string, unknown>;
}

/**
 * Extended chat message with additional metadata
 */
export interface ExtendedChatMessage extends ChatMessage {
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
    error?: string;
    errorTimestamp?: string;
    [key: string]: unknown;
  };
}

/**
 * Message chunk for streaming
 */
export interface MessageChunk {
  messageId: string;
  chunk: string;
  status?: 'streaming';
  metadata?: Record<string, unknown>;
}

/**
 * Socket events related to chat (server to client)
 */
export interface ChatServerToClientEvents extends ServerToClientEvents {
  'message:new': (message: ExtendedChatMessage) => void;
  'message:update': (message: ExtendedChatMessage) => void;
  'message:chunk': (data: MessageChunk) => void;
  'message:complete': (data: { messageId: string; metadata?: Record<string, unknown> }) => void;
  'message:error': (data: { messageId: string; error: string }) => void;
  'user:typing': (user: { userId: string; username: string }) => void;
  'user:stop_typing': (user: { userId: string; username: string }) => void;
}

/**
 * Socket events related to chat (client to server)
 */
export interface ChatClientToServerEvents extends ClientToServerEvents {
  'message:sent': (
    message: ExtendedChatMessage,
    callback: (response: { error?: string; message?: ExtendedChatMessage }) => void
  ) => void;
  'message:updated': (message: ExtendedChatMessage) => void;
  'user:typing': () => void;
  'user:stop_typing': () => void;
}

/**
 * Chat socket type with chat-specific events
 */
export type ChatSocket = SocketIOSocket<ChatServerToClientEvents, ChatClientToServerEvents>; 