/**
 * Socket Core Module Index
 * 
 * Exports all types and functionality from the core socket module.
 */

// Export event types from events.ts
export type { 
  ConnectionState,
  ServerToClientEvents,
  ClientToServerEvents,
  SocketAuthOptions,
  SocketConnectionConfig,
  ChatMessage,
  MessageChunk,
  MessageComplete,
  MessageError,
  MessageSendRequest,
  MessageReactionRequest,
  MessageResponse,
  TypingIndicatorData,
  TypingIndicatorRequest,
  ConnectionStatusData,
  ActionResponse,
  AuthResponse,
  ErrorResponse,
  StreamMode,
  BaseEvent,
  ChatModelStreamEvent,
  ChatModelStartEvent,
  ChatModelEndEvent,
  ChainStartEvent,
  ChainStreamEvent,
  ChainEndEvent,
  ChainErrorEvent,
  StreamEvent,
  LogEntry
} from './events';

// Export Socket and SocketContextValue types
export type { Socket, SocketContextValue } from './types';

// Export connection functions
export {
  createConnection,
  authenticateConnection,
  type ConnectionEventHandlers,
  type ConnectionManager
} from './connection';

// Export state management
export {
  getSocketStateManager,
  attachStateManager,
  type SocketStateManager
} from './state';