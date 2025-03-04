/**
 * Socket.IO Implementation
 * 
 * Provides a comprehensive Socket.IO implementation with React hooks,
 * connection management, and type safety.
 * 
 * This is the main entry point for the socket implementation.
 */

// Re-export core functionality
export {
  ConnectionState,
  createConnection,
  authenticateConnection,
  getSocketStateManager
} from './core';

// Re-export types
export type {
  Socket,
  SocketContextValue,
  SocketAuthOptions,
  SocketConnectionConfig,
  ServerToClientEvents,
  ClientToServerEvents,
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
  StreamEvent,
  LogEntry
} from './core';

// Re-export hooks
export {
  useSocket,
  useSocketEvent,
  useSocketEvents,
  useSocketEmit,
  useSocketEmitEvent
} from './hooks';

// Re-export providers
export {
  SocketProvider,
  SocketContext
} from './providers';

// Re-export utilities
export {
  getSocketLogger,
  LogLevel,
  resolveSocketUrl,
  resolveSocketPath
} from './utils';

// Singleton socket instance
let socketInstance: import('./core').Socket | null = null;

/**
 * Get the singleton socket instance
 * @returns The socket instance or null if not initialized
 */
export function getSocket(): import('./core').Socket | null {
  return socketInstance;
}

/**
 * Initialize the socket connection
 * @param auth - Authentication options
 * @param config - Connection configuration
 * @returns The socket instance
 */
export function initSocket(
  auth: import('./core').SocketAuthOptions,
  config?: Partial<import('./core').SocketConnectionConfig>
): import('./core').Socket {
  if (socketInstance) {
    return socketInstance;
  }
  
  const { socket } = createConnection(auth, config);
  socketInstance = socket;
  
  return socket;
}

/**
 * Disconnect the socket
 */
export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
  }
}

/**
 * Reconnect the socket
 */
export function reconnectSocket(): void {
  if (socketInstance) {
    socketInstance.connect();
  }
} 