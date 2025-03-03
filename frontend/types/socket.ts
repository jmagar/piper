import { Socket as IOSocket } from 'socket.io-client';

/**
 * Socket connection status
 */
export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
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
export interface SocketOptions {
  userId: string;
  username: string;
}

/**
 * Socket connection configuration
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
}

/**
 * Events sent from server to client
 */
export interface ServerToClientEvents {
  // Chat events
  'message:new': (message: ChatMessage) => void;
  'message:update': (message: ChatMessage) => void;
  'message:delete': (messageId: string) => void;
  'message:chunk': (data: { 
    messageId: string; 
    chunk: string; 
    chunkIndex?: number;
    timestamp?: string;
  }) => void;
  'message:complete': (data: { messageId: string; timestamp: string }) => void;
  'message:error': (error: { messageId: string; message: string }) => void;
  
  // Typing indicators
  'user:typing': (data: TypingIndicatorData) => void;
  'user:stop_typing': (data: TypingIndicatorData) => void;
  
  // Connection events
  'connection:status': (status: ConnectionStatusData) => void;
  
  // General events
  'error': (error: ErrorResponse) => void;
  
  // Debug events
  'pong': (data: { timestamp: number; roundtripTime: number; serverTime: number }) => void;
}

/**
 * Events sent from client to server
 */
export interface ClientToServerEvents {
  // Chat events
  'message:send': (message: MessageSendRequest, callback: (response: MessageResponse) => void) => void;
  'message:read': (messageId: string) => void;
  'message:react': (data: MessageReactionRequest, callback: (response: ActionResponse) => void) => void;
  'message:completed': (data: { messageId: string; timestamp: string }) => void;
  'message:error:acknowledged': (data: { messageId: string; message: string }) => void;
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
 * Extend the Socket type with our custom event interfaces
 */
export type Socket = IOSocket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Socket context value provided to components
 */
export interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | string | null;
  connectionState: ConnectionState;
  reconnect: () => void;
  disconnect: () => void;
}

// Chat Message Types
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  conversationId: string;
  createdAt: string;
  status?: 'sending' | 'sent' | 'delivered' | 'error' | 'streaming';
  metadata?: Record<string, unknown>;
}

export interface MessageChunk {
  messageId: string;
  chunk: string;
  chunkIndex?: number;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageSendRequest {
  content: string;
  conversationId?: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageReactionRequest {
  messageId: string;
  reaction: string;
}

export interface MessageResponse {
  message: ChatMessage;
  error?: string;
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
 * Union type for all streaming events
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
 * Extended ServerToClientEvents to include LangGraph-style events
 */
export interface LangGraphServerToClientEvents extends ServerToClientEvents {
  'stream:event': (event: StreamEvent) => void;
}
