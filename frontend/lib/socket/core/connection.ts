/**
 * Socket Connection Core Module
 * 
 * Core connection management for Socket.IO client implementation.
 * Provides type-safe connection handling with strong error recovery.
 */

import { io, ManagerOptions, SocketOptions as IOSocketOptions } from 'socket.io-client';
import { Socket } from './types';
import {
  ConnectionState,
  SocketAuthOptions,
  SocketConnectionConfig,
  ErrorResponse
} from './events';
import { getSocketLogger } from '../utils/logger';

// Create a namespaced logger for connection
const logger = getSocketLogger({ namespace: 'socket:connection' });

// Get the dynamic URL based on the window location
const getDynamicUrl = (): string => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4100`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';
};

// Default connection configuration
const DEFAULT_CONFIG: SocketConnectionConfig = {
  url: process.env.NEXT_PUBLIC_API_URL || getDynamicUrl(),
  path: '/socket.io',
  autoConnect: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  reconnection: true,
  showToasts: false,
  withCredentials: false, // Disable credentials for CORS
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
 * Safely convert any error to a standard Error object
 */
function standardizeError(err: unknown): Error {
  if (err instanceof Error) {
    return err;
  }
  if (typeof err === 'string') {
    return new Error(err);
  }
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    const error = new Error(err.message);
    // Copy other properties
    for (const key in err) {
      if (Object.prototype.hasOwnProperty.call(err, key)) {
        (error as any)[key] = (err as any)[key];
      }
    }
    return error;
  }
  return new Error(String(err));
}

/**
 * Safely extract the current URL from a socket
 */
function getSocketUrl(socket: Socket): string {
  try {
    // Safely try to access the URL without relying on private properties
    return (socket as any)._opts?.hostname || 
           (socket as any).io?.opts?.hostname || 
           (socket as any).io?.uri || 
           'unknown';
  } catch (e) {
    return 'unknown';
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
    ...config as Partial<SocketConnectionConfig>
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

  // For CORS support
  if (mergedConfig.withCredentials !== undefined) {
    socketOptions.withCredentials = mergedConfig.withCredentials;
  }
  
  // For extra headers
  if (mergedConfig.extraHeaders) {
    socketOptions.extraHeaders = mergedConfig.extraHeaders;
  }

  // Create the socket instance
  const socket: Socket = io((mergedConfig.url ?? DEFAULT_CONFIG.url) || '', socketOptions);
  
  // Add connection debugging
  logger.info('Socket connecting with options:', {
    url: mergedConfig.url ?? DEFAULT_CONFIG.url,
    path: socketOptions.path,
    autoConnect: socketOptions.autoConnect,
    withCredentials: mergedConfig.withCredentials,
    extraHeaders: mergedConfig.extraHeaders ? true : undefined
  });

  // Connection fallback logic
  let connectionAttempted = false;
  const attemptAlternativeConnection = () => {
    if (connectionAttempted) return;
    connectionAttempted = true;
    
    logger.warn('Primary connection failed, attempting alternative connection strategy');
    
    // Get current URL and hostname in a safe way
    const currentUrl = getDynamicUrl();
    const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    
    // Try alternative connection
    socket.disconnect();
    
    // Choose alternative URL based on current URL
    let alternativeUrl: string;
    if (currentHostname === 'localhost') {
      // Try IP address instead of localhost
      alternativeUrl = currentUrl.replace('localhost', '127.0.0.1');
      logger.info('Trying alternative connection with IP address:', { url: alternativeUrl });
    } else {
      // Try localhost instead of hostname
      alternativeUrl = currentUrl.replace(currentHostname, 'localhost');
      logger.info('Trying alternative connection with localhost:', { url: alternativeUrl });
    }
    
    // Create new socket options with alternative URL
    const newOptions = { 
      ...socketOptions,
      // Additional reconnection settings for fallback
      reconnectionAttempts: 3,
      reconnectionDelay: 500
    };
    
    // Create a new connection (rather than modifying private properties)
    setTimeout(() => {
      try {
        // Close and replace with new connection
        socket.disconnect();
        const newSocket = io(alternativeUrl, newOptions);
        
        // Copy event listeners from old socket
        if (newSocket && typeof newSocket.on === 'function') {
          // TypeScript complains about 'io' property, so we use an assertion
          for (const eventName in (socket as any)._callbacks) {
            if (Object.prototype.hasOwnProperty.call((socket as any)._callbacks, eventName)) {
              const listeners = (socket as any)._callbacks[eventName];
              if (Array.isArray(listeners)) {
                listeners.forEach(listener => {
                  newSocket.on(eventName, listener);
                });
              }
            }
          }
          
          // Replace the old socket with the new one
          Object.assign(socket, newSocket);
        }
      } catch (e) {
        logger.error('Failed to create alternative connection:', { 
          error: e instanceof Error ? e.message : String(e) 
        });
        // Reconnect with original configuration
        socket.connect();
      }
    }, 1000);
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
    // Use FAILED state for errors
    connectionManager.setState(ConnectionState.FAILED, standardizeError(err));
    
    // Get reconnection attempts in a safe way
    const reconnectionAttempts = (() => {
      try {
        if (typeof (socket.io as any)?.reconnectionAttempts === 'function') {
          return (socket.io as any).reconnectionAttempts();
        }
        return (socket.io as any)?.reconnectionAttempts || 0;
      } catch (e) {
        return 0;
      }
    })();
    
    connectionManager.setReconnectAttempts(reconnectionAttempts);
    
    // Log detailed connection error
    logger.error('Socket connection error', {
      error: err instanceof Error ? err.message : String(err),
      url: getSocketUrl(socket),
      reconnectAttempt: reconnectionAttempts,
      backendPort: process.env.NEXT_PUBLIC_API_PORT || '4100',
      isNetworkError: typeof window !== 'undefined' ? !window.navigator.onLine : false
    });
    
    // After a few failed connection attempts, try alternative strategy
    if (reconnectionAttempts >= 2) {
      attemptAlternativeConnection();
    }
    
    if (eventHandlers.onConnectError) {
      eventHandlers.onConnectError(standardizeError(err));
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
    const errorObj = standardizeError(err);
    connectionManager.setState(ConnectionState.FAILED, errorObj);
    
    if (eventHandlers.onError) {
      eventHandlers.onError(errorObj);
    }
  });
  
  // Create reconnect function
  const reconnect = () => {
    if (socket) {
      // Get reconnection attempt count safely
      const reconnectionAttempts = (() => {
        try {
          if (typeof (socket.io as any)?.reconnectionAttempts === 'function') {
            return (socket.io as any).reconnectionAttempts();
          }
          return (socket.io as any)?.reconnectionAttempts || 0;
        } catch (e) {
          return 0;
        }
      })();
        
      logger.info('Manual reconnection attempt', {
        currentState: connectionManager.getState(),
        reconnectAttempts: reconnectionAttempts,
        uri: getSocketUrl(socket)
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
