import type { ExtendedChatMessage } from './chat';
import type { Socket as SocketIOSocket } from 'socket.io-client';

/**
 * Connection states for the socket
 */
export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

/**
 * Message status enum
 */
export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  ERROR = 'error'
}

/**
 * Socket connection status
 */
export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Socket auth options
 */
export interface SocketAuthOptions {
  token: string;
  userId: string;
}

/**
 * Socket connection configuration
 */
export interface SocketConnectionConfig {
  url: string;
  path: string;
  autoConnect: boolean;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  reconnectionDelayMax: number;
  timeout: number;
}

/**
 * Socket options
 */
export interface SocketOptions {
    userId: string;
    username: string;
}

/**
 * Chat message interface for socket communications
 */
export interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  createdAt: string;
  updatedAt?: string;
  status?: string;
  type?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Message chunk interface for streaming responses
 */
export interface MessageChunk {
  messageId: string;
  chunk: string;
  metadata?: Record<string, unknown>;
}

/**
 * Message complete interface for streaming completion
 */
export interface MessageComplete {
  messageId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Message error interface for error handling
 */
export interface MessageError {
  messageId: string;
  error: string;
  metadata?: Record<string, unknown>;
}

/**
 * Message callback interface for response handling
 */
export interface MessageCallback {
  (response: { error?: string; message?: ChatMessage; [key: string]: unknown }): void;
}

/**
 * Events sent from server to client
 */
export interface ServerToClientEvents {
    'message': (message: ExtendedChatMessage) => void; // Generic message event
    'message:new': (message: ExtendedChatMessage) => void;
    'message:update': (message: ExtendedChatMessage) => void;
    'message:chunk': (data: { messageId: string; chunk: string }) => void;
    'message:error': (data: { messageId: string; error: string }) => void;
    'message:complete': (data: { messageId: string; metadata?: Record<string, unknown> }) => void;
    'user:typing': (user: { userId: string; username: string }) => void;
    'user:stop_typing': (user: { userId: string; username: string }) => void;
}

/**
 * Events sent from client to server
 */
export interface ClientToServerEvents {
    'message:send': (
        message: ExtendedChatMessage,
        callback: (response: { error?: string; message?: ExtendedChatMessage }) => void
    ) => void;
    'message:sent': (
        message: ExtendedChatMessage,
        callback: (response: { error?: string; message?: ExtendedChatMessage }) => void
    ) => void;
    'message:updated': (message: ExtendedChatMessage) => void;
    'user:typing': () => void;
    'user:stop_typing': () => void;
}

/**
 * Socket type with event interfaces
 */
export type Socket = SocketIOSocket<ServerToClientEvents, ClientToServerEvents>;

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData {
    userId: string;
    username: string;
}
