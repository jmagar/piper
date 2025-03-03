/**
 * Socket.IO Event Type Definitions
 * 
 * This file provides type definitions for all socket events used in the application.
 * It ensures type safety across socket handlers and event emitters.
 */

/**
 * Message chunk event for streaming responses
 */
export interface MessageChunkEvent {
  messageId: string;
  chunk: string;
  chunkIndex?: number;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Message completion event
 */
export interface MessageCompleteEvent {
  messageId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Message error event
 */
export interface MessageErrorEvent {
  messageId: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * User typing indicator event
 */
export interface TypingIndicatorEvent {
  userId: string;
  typing: boolean;
  conversationId?: string;
  username?: string;
}

/**
 * Socket authentication options
 */
export interface SocketAuthOptions {
  userId: string;
  token?: string;
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
 * Connection state enum
 */
export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

/**
 * Server-to-client events interface
 */
export interface ServerToClientEvents {
  'message:new': (message: any) => void;
  'message:update': (message: any) => void;
  'message:delete': (messageId: string) => void;
  'message:chunk': (data: MessageChunkEvent) => void;
  'message:complete': (data: MessageCompleteEvent) => void;
  'message:error': (error: MessageErrorEvent) => void;
  
  'user:typing': (data: TypingIndicatorEvent) => void;
  
  'connection:status': (status: ConnectionState) => void;
  
  'error': (error: { message: string; details?: any }) => void;
  'pong': (data: { timestamp: number; roundtripTime: number; serverTime: number }) => void;
}

/**
 * Client-to-server events interface
 */
export interface ClientToServerEvents {
  'message:send': (message: any, callback?: (response: any) => void) => void;
  'message:read': (messageId: string) => void;
  'message:react': (data: any, callback?: (response: any) => void) => void;
  'message:completed': (data: { messageId: string; timestamp: string }) => void;
  'message:error:acknowledged': (data: { messageId: string; message: string }) => void;
  
  'typing:start': (data: { conversationId: string; userId?: string }) => void;
  'typing:stop': (data: { conversationId: string; userId?: string }) => void;
  
  'auth': (data: SocketAuthOptions, callback: (response: any) => void) => void;
  'ping': (data: { timestamp: number }) => void;
} 