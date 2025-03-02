/**
 * Core Socket Implementation
 * 
 * This file implements the core socket connection logic, following a layered architecture pattern
 * with proper type safety, connection management and error handling.
 */

import { io, ManagerOptions, SocketOptions as IOSocketOptions } from 'socket.io-client';
import {
  ConnectionState,
  Socket,
  ServerToClientEvents,
  ClientToServerEvents,
  SocketAuthOptions,
  SocketConnectionConfig
} from '@/types/socket';

// Default connection config
const DEFAULT_CONFIG: SocketConnectionConfig = {
  url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100',
  path: '/socket.io',
  autoConnect: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
};

/**
 * Event handler types for socket events
 */
export interface SocketEventHandlers {
  onConnect?: (socket: Socket) => void;
  onDisconnect?: (reason: string) => void;
  onConnectError?: (err: Error) => void;
  onReconnectAttempt?: (attempt: number) => void;
  onReconnectFailed?: () => void;
  onError?: (err: Error) => void;
}

/**
 * Connection manager for tracking socket connection state
 */
export class ConnectionManager {
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private listeners: Set<(state: ConnectionState) => void> = new Set();
  private error: Error | null = null;
  private reconnectAttempts: number = 0;

  /**
   * Update the connection state and notify listeners
   */
  setState(state: ConnectionState, error?: Error): void {
    this.state = state;
    if (error) {
      this.error = error;
    }
    this.notifyListeners();
  }

  /**
   * Get the current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Set the current reconnection attempt
   */
  setReconnectAttempts(attempts: number): void {
    this.reconnectAttempts = attempts;
    this.notifyListeners();
  }

  /**
   * Get the current reconnection attempt count
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Get the current error
   */
  getError(): Error | null {
    return this.error;
  }

  /**
   * Add a listener for state changes
   * @returns A function to remove the listener
   */
  addListener(listener: (state: ConnectionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Reset the error state
   */
  clearError(): void {
    this.error = null;
    this.notifyListeners();
  }
}

/**
 * Create a new socket connection
 */
export function createSocket(
  auth: SocketAuthOptions,
  config?: Partial<SocketConnectionConfig>,
  eventHandlers: SocketEventHandlers = {}
) {
  // Create connection manager
  const connectionManager = new ConnectionManager();
  
  // Merge configuration with defaults
  const mergedConfig: SocketConnectionConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };
  
  // Prepare socket.io options
  const socketOptions: Partial<ManagerOptions & IOSocketOptions> = {
    autoConnect: mergedConfig.autoConnect,
    reconnectionAttempts: mergedConfig.reconnectionAttempts,
    reconnectionDelay: mergedConfig.reconnectionDelay,
    reconnectionDelayMax: mergedConfig.reconnectionDelayMax,
    timeout: mergedConfig.timeout,
    auth: {
      token: auth.token,
      userId: auth.userId
    },
    path: mergedConfig.path
  };

  // Create the socket instance
  const socket: Socket = io(mergedConfig.url, socketOptions);
  
  // Set initial connection state
  connectionManager.setState(
    mergedConfig.autoConnect ? ConnectionState.CONNECTING : ConnectionState.DISCONNECTED
  );
  
  // Register socket event handlers
  socket.on('connect', () => {
    connectionManager.setState(ConnectionState.CONNECTED);
    connectionManager.setReconnectAttempts(0);
    connectionManager.clearError();
    if (eventHandlers.onConnect) {
      eventHandlers.onConnect(socket);
    }
  });
  
  socket.on('disconnect', (reason) => {
    connectionManager.setState(ConnectionState.DISCONNECTED);
    if (eventHandlers.onDisconnect) {
      eventHandlers.onDisconnect(reason);
    }
  });
  
  socket.on('connect_error', (err) => {
    connectionManager.setState(ConnectionState.FAILED, err);
    if (eventHandlers.onConnectError) {
      eventHandlers.onConnectError(err);
    }
  });
  
  socket.io.on('reconnect_attempt', (attempt) => {
    connectionManager.setState(ConnectionState.RECONNECTING);
    connectionManager.setReconnectAttempts(attempt);
    if (eventHandlers.onReconnectAttempt) {
      eventHandlers.onReconnectAttempt(attempt);
    }
  });
  
  socket.io.on('reconnect_failed', () => {
    connectionManager.setState(ConnectionState.FAILED);
    if (eventHandlers.onReconnectFailed) {
      eventHandlers.onReconnectFailed();
    }
  });
  
  // Handle error events through connect_error instead
  // This is safer than using the 'error' event which might not be properly typed
  socket.on('connect_error', (err) => {
    connectionManager.setState(ConnectionState.FAILED, err);
    if (eventHandlers.onError) {
      eventHandlers.onError(err);
    }
  });
  
  // Create reconnect function
  const reconnect = () => {
    // Only attempt reconnection if not already connecting or connected
    if (connectionManager.getState() !== ConnectionState.CONNECTING && 
        connectionManager.getState() !== ConnectionState.CONNECTED) {
      connectionManager.setState(ConnectionState.CONNECTING);
      // Force socket to reconnect
      socket.connect();
    }
  };
  
  // Create disconnect function
  const disconnect = () => {
    connectionManager.setState(ConnectionState.DISCONNECTED);
    socket.disconnect();
  };
  
  return {
    socket,
    connectionManager,
    reconnect,
    disconnect
  };
}

/**
 * Register an event handler for a socket event
 * @returns A function to unregister the event handler
 */
export function registerSocketEvent<K extends keyof ServerToClientEvents>(
  socket: Socket | null,
  event: K,
  handler: ServerToClientEvents[K]
): () => void {
  if (!socket) {
    return () => {};
  }
  
  socket.on(event, handler as any);
  return () => {
    socket.off(event, handler as any);
  };
}

/**
 * Emit a socket event with promise-based response handling
 */
export function emitWithPromise<
  E extends keyof ClientToServerEvents,
  T = unknown
>(
  socket: Socket | null,
  event: E,
  ...args: Parameters<ClientToServerEvents[E]> extends [infer A, any] ? [A] : []
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not connected'));
      return;
    }
    
    try {
      // We need to add the callback as the last parameter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (socket as any).emit(event, ...(args as any[]), (response: any) => {
        if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
} 