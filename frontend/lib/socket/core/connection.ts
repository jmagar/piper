/**
 * Socket Connection Core Module
 * 
 * Core connection management for Socket.IO client implementation.
 * Provides type-safe connection handling with strong error recovery.
 */

import { io, ManagerOptions, SocketOptions as IOSocketOptions } from 'socket.io-client';
import {
  ConnectionState,
  Socket,
  SocketAuthOptions,
  SocketConnectionConfig
} from './types';
import { getSocketLogger } from '../utils/logger';

// Create a namespaced logger for connection
const logger = getSocketLogger({ namespace: 'socket:connection' });

// Default connection configuration
const DEFAULT_CONFIG: SocketConnectionConfig = {
  url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100',
  path: '/socket.io',
  autoConnect: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  reconnection: true,
  showToasts: true,
};

/**
 * Event handler types for socket lifecycle events
 */
export interface ConnectionEventHandlers {
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
   * Set the current reconnection attempt count
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
   * Get the current error if any
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
export function createConnection(
  auth: SocketAuthOptions,
  config?: Partial<SocketConnectionConfig>,
  eventHandlers: ConnectionEventHandlers = {}
): {
  socket: Socket;
  connectionManager: ConnectionManager;
  reconnect: () => void;
  disconnect: () => void;
} {
  // Create connection manager
  const connectionManager = new ConnectionManager();
  
  // Merge configuration with defaults
  const mergedConfig: SocketConnectionConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };
  
  // Prepare socket.io options
  const socketOptions: Partial<ManagerOptions & IOSocketOptions> = {
    autoConnect: mergedConfig.autoConnect ?? true,
    reconnectionAttempts: mergedConfig.reconnectionAttempts ?? 5,
    reconnectionDelay: mergedConfig.reconnectionDelay ?? 1000,
    reconnectionDelayMax: mergedConfig.reconnectionDelayMax ?? 5000,
    timeout: mergedConfig.timeout ?? 20000,
    auth: {
      token: auth.token || '',
      userId: auth.userId || ''
    },
    path: mergedConfig.path ?? '/socket.io'
  };

  // Create the socket instance
  const socket: Socket = io((mergedConfig.url ?? DEFAULT_CONFIG.url) || '', socketOptions);
  
  // Add connection debugging
  logger.info('Socket connecting with options:', {
    url: mergedConfig.url ?? DEFAULT_CONFIG.url,
    path: socketOptions.path,
    autoConnect: socketOptions.autoConnect,
    withCredentials: mergedConfig.withCredentials,
    extraHeaders: mergedConfig.extraHeaders
  });

  // Connection fallback logic
  let connectionAttempted = false;
  const attemptAlternativeConnection = () => {
    if (connectionAttempted) return;
    connectionAttempted = true;
    
    logger.warn('Primary connection failed, attempting alternative connection strategy');
    
    // Try alternative connection strategies
    const currentUrl = typeof socket.io?.uri === 'string' ? socket.io.uri : '';
    let alternativeUrl: string | null = null;
    
    // Strategy 1: If using localhost, try the actual machine hostname
    if (currentUrl.includes('localhost') && typeof window !== 'undefined') {
      alternativeUrl = currentUrl.replace('localhost', window.location.hostname);
      logger.info('Trying alternative connection with hostname:', alternativeUrl);
    } 
    // Strategy 2: If using a specific hostname, try localhost
    else if (typeof window !== 'undefined' && !currentUrl.includes('localhost')) {
      alternativeUrl = currentUrl.replace(window.location.hostname, 'localhost');
      logger.info('Trying alternative connection with localhost:', alternativeUrl);
    }
    
    if (alternativeUrl) {
      // Disconnect and reconfigure
      socket.disconnect();
      // Safely update the URI if possible
      if (socket.io && typeof socket.io.uri === 'string') {
        socket.io.uri = alternativeUrl;
      }
      setTimeout(() => socket.connect(), 1000);
    }
  };
  
  // Set initial connection state
  connectionManager.setState(
    mergedConfig.autoConnect ?? true ? ConnectionState.CONNECTING : ConnectionState.DISCONNECTED
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
    connectionManager.setState(ConnectionState.ERROR, err);
    
    // Get reconnection attempts - handle both socket.io v3 and v4 interfaces
    const reconnectionAttempts = typeof socket.io?.reconnectionAttempts === 'function' 
      ? socket.io.reconnectionAttempts() 
      : (socket.io as any)?.reconnectionAttempts || 0;
    
    connectionManager.setReconnectAttempts(reconnectionAttempts);
    
    // Log detailed connection error
    logger.error('Socket connection error', {
      error: err.message,
      url: typeof socket.io?.uri === 'string' ? socket.io.uri : 'unknown',
      reconnectAttempt: reconnectionAttempts,
      backendPort: process.env.NEXT_PUBLIC_API_PORT || '4100',
      isNetworkError: typeof window !== 'undefined' ? !window.navigator.onLine : false
    });
    
    // After 2 failed connection attempts, try alternative strategy
    if (reconnectionAttempts >= 2) {
      attemptAlternativeConnection();
    }
    
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
  
  // Error handler (in addition to connect_error)
  socket.on('error', (err) => {
    connectionManager.setState(ConnectionState.FAILED, typeof err === 'string' ? new Error(err) : err);
    
    if (eventHandlers.onError) {
      eventHandlers.onError(typeof err === 'string' ? new Error(err) : err);
    }
  });
  
  // Create reconnect function
  const reconnect = () => {
    if (socket) {
      // Log reconnection attempt with current socket state
      const reconnectionAttempts = typeof socket.io?.reconnectionAttempts === 'function' 
        ? socket.io.reconnectionAttempts() 
        : (socket.io as any)?.reconnectionAttempts || 0;
        
      logger.info('Manual reconnection attempt', {
        currentState: connectionManager.getState(),
        reconnectAttempts: reconnectionAttempts,
        uri: typeof socket.io?.uri === 'string' ? socket.io.uri : 'unknown'
      });
      
      // Try to reconnect if we're not already connected
      if (connectionManager.getState() !== ConnectionState.CONNECTED) {
        // First check if network is available (browser only)
        if (typeof window !== 'undefined' && !window.navigator.onLine) {
          logger.warn('Network is offline, waiting for online status before reconnecting');
          // Set up one-time online listener if we're offline
          const onlineListener = () => {
            logger.info('Network is back online, attempting to reconnect');
            socket.connect();
            window.removeEventListener('online', onlineListener);
          };
          window.addEventListener('online', onlineListener);
          return;
        }
        
        socket.connect();
      }
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
 * Authenticate with the socket server
 */
export function authenticateConnection(
  socket: Socket, 
  auth: SocketAuthOptions
): Promise<{ success: boolean; userId?: string; error?: string }> {
  return new Promise((resolve) => {
    socket.emit('auth', auth, (response) => {
      resolve(response);
    });
  });
} 