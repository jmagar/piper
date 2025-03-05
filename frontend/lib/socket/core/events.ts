/**
 * Socket Events Type Definitions
 * 
 * Centralized event type definitions for Socket.IO implementation.
 * Contains all event types for both client-to-server and server-to-client events.
 */

/**
 * Socket connection status enum (forward declaration)
 */
export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

/**
 * Events sent from server to client
 */
export interface ServerToClientEvents {
  // Chat events
  'message:new': (message: ChatMessage) => void;
  'message:update': (message: ChatMessage) => void;
  'message:delete': (messageId: string) => void;
  'message:chunk': (data: MessageChunk) => void;
  'message:complete': (data: MessageComplete) => void;
  'message:error': (error: MessageError) => void;
  
  // Typing indicators
  'user:typing': (data: TypingIndicatorData) => void;
  'user:stop_typing': (data: TypingIndicatorData) => void;
  
  // Connection events
  'connection:status': (status: ConnectionStatusData) => void;
  
  // General events
  'error': (error: ErrorResponse) => void;
  
  // Debug events
  'pong': (data: { timestamp: number; roundtripTime: number; serverTime: number }) => void;
  
  // Stream events
  'stream:event': (event: StreamEvent) => void;
  
  // Logging events
  'mcp:all:logs': (logEntry: LogEntry) => void;
  'debug:*': (message: string) => void;
}

/**
 * Events sent from client to server
 */
export interface ClientToServerEvents {
  // Chat events
  'message:send': (message: MessageSendRequest, callback: (response: MessageResponse) => void) => void;
  'message:read': (messageId: string) => void;
  'message:react': (data: MessageReactionRequest, callback: (response: ActionResponse) => void) => void;
  'message:completed': (data: MessageComplete) => void;
  'message:error:acknowledged': (data: MessageError) => void;
  'message:error:client': (data: { messageId: string; error: string; timestamp: string }) => void;
  
  // Typing indicators
  'typing:start': (data: TypingIndicatorRequest) => void;
  'typing:stop': (data: TypingIndicatorRequest) => void;
  
  // Connection events
  'auth': (data: SocketAuthOptions, callback: (response: AuthResponse) => void) => void;
  
  // Debug events
  'ping': (data: { timestamp: number }) => void;
}

/**
 * Socket authentication options
 */
export interface SocketAuthOptions {
  userId?: string;
  token?: string;
}

/**
 * Socket configuration options
 */
export interface SocketConnectionConfig {
  url?: string;
  path?: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
  reconnection?: boolean;
  showToasts?: boolean;
  withCredentials?: boolean;
  extraHeaders?: Record<string, string>;
}

// Chat Message Types
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  conversationId?: string;
  createdAt: string;
  updatedAt?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'error' | 'streaming';
  type?: string;
  metadata?: Record<string, unknown>;
  user?: {
    id: string;
    name?: string;
  };
}

export interface MessageChunk {
  messageId: string;
  chunk: string;
  chunkIndex?: number;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageComplete {
  messageId: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageError {
  messageId: string;
  message?: string;
  error?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageSendRequest {
  content: string;
  conversationId?: string;
  parentId?: string;
  role?: 'user' | 'assistant' | 'system';
  userId?: string;
  user?: {
    id: string;
    name?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface MessageReactionRequest {
  messageId: string;
  reaction: string;
}

export interface MessageResponse {
  message?: ChatMessage;
  error?: string;
  success?: boolean;
}

// Typing Indicator Types
export interface TypingIndicatorData {
  userId: string;
  username?: string;
  conversationId?: string;
  typing: boolean;
}

export interface TypingIndicatorRequest {
  conversationId: string;
}

// Connection Status Types
export interface ConnectionStatusData {
  status: ConnectionState;
  userId?: string;
  timestamp: string;
}

// Response Types
export interface ActionResponse {
  success: boolean;
  error?: string;
}

export interface AuthResponse {
  success: boolean;
  userId?: string;
  error?: string;
  timestamp?: string;
}

export interface ErrorResponse {
  code?: string;
  message: string;
  messageId?: string;
  details?: Record<string, unknown>;
}

/**
 * LangGraph-style event types for streaming
 */
export type StreamMode = 'values' | 'updates' | 'messages' | 'custom' | 'debug';

/**
 * Base event interface for all events
 */
export interface BaseEvent {
  event: string;
  name: string;
  run_id: string;
  tags?: string[];
  metadata: Record<string, any>;
  data: any;
  parent_ids?: string[];
}

/**
 * Chat model stream event
 */
export interface ChatModelStreamEvent extends BaseEvent {
  event: 'on_chat_model_stream';
  data: {
    chunk: {
      content: string;
      id: string;
    }
  };
}

/**
 * Chat model start event
 */
export interface ChatModelStartEvent extends BaseEvent {
  event: 'on_chat_model_start';
  data: {
    input: any;
  };
}

/**
 * Chat model end event
 */
export interface ChatModelEndEvent extends BaseEvent {
  event: 'on_chat_model_end';
  data: {
    output: any;
  };
}

/**
 * Chain start event
 */
export interface ChainStartEvent extends BaseEvent {
  event: 'on_chain_start';
  data: {
    input: any;
  };
}

/**
 * Chain stream event
 */
export interface ChainStreamEvent extends BaseEvent {
  event: 'on_chain_stream';
  data: {
    chunk: any;
  };
}

/**
 * Chain end event
 */
export interface ChainEndEvent extends BaseEvent {
  event: 'on_chain_end';
  data: {
    output: any;
  };
}

/**
 * Chain error event
 */
export interface ChainErrorEvent extends BaseEvent {
  event: 'on_chain_error';
  data: {
    error: any;
  };
}

/**
 * LangGraph Stream Event Union Type
 */
export type StreamEvent = 
  | ChatModelStreamEvent 
  | ChatModelStartEvent 
  | ChatModelEndEvent 
  | ChainStartEvent 
  | ChainStreamEvent 
  | ChainEndEvent 
  | ChainErrorEvent;

/**
 * Log entry for debug logs
 */
export interface LogEntry {
  timestamp: string;
  namespace: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  server: string;
  metadata?: Record<string, unknown>;
} 