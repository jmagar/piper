'use client';

/**
 * Socket Provider
 * 
 * React context provider for Socket.IO functionality.
 * Manages socket connection lifecycle and provides socket instance to components.
 */

import React, { createContext, useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import type { Socket } from '../core/types';
import {
  ConnectionState,
  SocketAuthOptions,
  SocketConnectionConfig
} from '../core/events';
import type { SocketContextValue } from '../core/types';
import { createConnection } from '../core/connection';
import { getSocketStateManager } from '../core/state';
import { getSocketLogger } from '../utils/logger';
import { resolveSocketUrl, resolveSocketPath } from '../utils/url-resolver';
import { SocketDebug } from '../utils/debug';

// Create socket context
export const SocketContext = createContext<SocketContextValue | null>(null);

// Singleton socket instance
let socketInstance: Socket | null = null;

/**
 * Socket provider props
 */
interface SocketProviderProps {
  /**
   * React children
   */
  children: React.ReactNode;
  
  /**
   * Initial authentication options
   */
  initialAuth?: SocketAuthOptions | null;
  
  /**
   * Socket connection configuration
   */
  config?: Partial<SocketConnectionConfig>;
  
  /**
   * Whether to show toast notifications
   */
  showToasts?: boolean;
}

/**
 * Socket provider component
 * 
 * Provides socket context to child components
 */
export function SocketProvider({
  children,
  initialAuth = null,
  config,
  showToasts = true
}: SocketProviderProps) {
  // Socket state
  const [socket, setSocket] = useState<Socket | null>(socketInstance);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<Error | string | null>(null);
  
  // Track if component is mounted
  const isMounted = useRef(true);
  
  // Get socket state manager
  const stateManager = getSocketStateManager();
  
  // Get socket logger
  const logger = getSocketLogger({ namespace: 'socket:provider' });
  
  // Run environment diagnostics on initialization
  useEffect(() => {
    SocketDebug.checkEnvironment();
  }, []);
  
  // Connect to socket
  const connect = (auth: SocketAuthOptions, connectionConfig?: Partial<SocketConnectionConfig>) => {
    // Don't connect if already connected
    if (socketInstance) {
      logger.info('Socket already connected, reusing instance');
      return;
    }
    
    // Resolve socket URL and path
    const url = resolveSocketUrl();
    const path = resolveSocketPath();
    
    logger.info(`Connecting to socket server at ${url}${path}`);
    
    // Create connection
    const { socket: newSocket } = createConnection(
      auth,
      {
        url,
        path,
        showToasts,
        ...connectionConfig,
        ...config
      },
      {
        onConnect: (socket) => {
          logger.info('Socket connected', { socketId: socket.id });
          
          if (showToasts) {
            toast.success('Connected to server');
          }
          
          // Set socket instance
          if (isMounted.current) {
            setSocket(socket);
            setConnectionState(ConnectionState.CONNECTED);
            setError(null);
          }
          
          // Set socket for logger
          logger.setSocket(socket);
        },
        onDisconnect: (reason) => {
          logger.warn(`Socket disconnected: ${reason}`);
          
          if (showToasts) {
            toast.warning(`Disconnected: ${reason}`);
          }
          
          if (isMounted.current) {
            setConnectionState(ConnectionState.DISCONNECTED);
          }
        },
        onConnectError: (err) => {
          logger.error('Socket connection error', { error: err.message });
          
          if (showToasts) {
            toast.error(`Connection error: ${err.message}`);
          }
          
          if (isMounted.current) {
            setConnectionState(ConnectionState.FAILED);
            setError(err);
          }
        },
        onReconnectAttempt: (attempt) => {
          logger.info(`Reconnection attempt ${attempt}`);
          
          if (isMounted.current) {
            setConnectionState(ConnectionState.RECONNECTING);
          }
        },
        onReconnectFailed: () => {
          logger.error('Reconnection failed after max attempts');
          
          if (showToasts) {
            toast.error('Failed to reconnect after multiple attempts');
          }
          
          if (isMounted.current) {
            setConnectionState(ConnectionState.FAILED);
          }
        },
        onError: (err) => {
          logger.error('Socket error', { error: err.message });
          
          if (showToasts) {
            toast.error(`Socket error: ${err.message}`);
          }
          
          if (isMounted.current) {
            setError(err);
          }
        }
      }
    );
    
    // Store singleton instance
    socketInstance = newSocket;
    
    // Set socket instance
    if (isMounted.current) {
      setSocket(newSocket);
    }
    
    // Set socket for logger
    logger.setSocket(newSocket);
  };
  
  // Disconnect from socket
  const disconnect = () => {
    if (socketInstance) {
      logger.info('Disconnecting socket');
      socketInstance.disconnect();
    }
  };
  
  // Reconnect to socket
  const reconnect = () => {
    if (socketInstance) {
      logger.info('Reconnecting socket');
      socketInstance.connect();
    }
  };
  
  // Handle reconnection failures
  useEffect(() => {
    if (connectionState === ConnectionState.FAILED) {
      logger.warn('Connection failed, will try alternative connection strategy');
      
      // Alternative connection strategy after multiple failures
      if (error && (error instanceof Error && error.message === 'timeout')) {
        // If we've timed out, we might need to try an alternative URL
        try {
          // Wait a bit before trying an alternative approach
          const reconnectTimeout = setTimeout(() => {
            logger.info('Trying alternative connection approach after timeout');
            
            // Try to connect with relative URL if not already using one
            if (config?.url && !config.url.startsWith('/')) {
              const relativeUrl = '/socket.io';
              logger.info(`Trying relative URL: ${relativeUrl}`);
              
              // Only create a new connection if socket is not already connected
              if (!socketInstance || !socketInstance.connected) {
                connect(
                  initialAuth || { userId: 'anonymous' },
                  {
                    ...(config || {}),
                    url: window.location.origin,
                    path: relativeUrl,
                    reconnectionAttempts: 3
                  }
                );
              }
            }
          }, 3000);
          
          return () => clearTimeout(reconnectTimeout);
        } catch (err) {
          logger.error('Error in alternative connection strategy', { 
            error: err instanceof Error ? err.message : String(err) 
          });
        }
      }
    }
  }, [connectionState, error, config, initialAuth]);
  
  // Listen for state changes
  useEffect(() => {
    const removeListener = stateManager.addListener((state) => {
      if (isMounted.current) {
        setConnectionState(state);
      }
    });
    
    return () => {
      removeListener();
    };
  }, [stateManager]);
  
  // Connect with initial auth if provided
  useEffect(() => {
    if (initialAuth) {
      connect(initialAuth, config);
    }
    
    // Cleanup on unmount
    return () => {
      isMounted.current = false;
      
      // Don't disconnect here as other components might be using the socket
      // Only clean up listeners
    };
  }, [initialAuth, config]);
  
  // Add connection testing on error
  useEffect(() => {
    if (connectionState === ConnectionState.FAILED) {
      // Attempt to diagnose the connection issue
      const socketUrl = config?.url || '';
      const socketPath = config?.path || '/socket.io';
      
      if (typeof window !== 'undefined') {
        // Only run in browser
        SocketDebug.testConnection(socketUrl, socketPath).then(result => {
          if (!result.success) {
            // Try alternative URLs if the initial one fails
            const altUrls = [
              `${window.location.protocol}//${window.location.hostname}:4100`,
              `${window.location.protocol}//localhost:4100`,
              process.env.NEXT_PUBLIC_API_URL
            ].filter(Boolean) as string[];
            
            // Test each alternative URL sequentially
            Promise.all(altUrls.map(url => SocketDebug.testConnection(url)))
              .then(results => {
                const successfulConnection = results.find(r => r.success);
                if (successfulConnection) {
                  logger.info('Found working alternative connection:', { 
                    connection: successfulConnection 
                  });
                  
                  // Try to reconnect with the successful URL
                  if (socket && successfulConnection.url) {
                    // Extract base URL from the successful test
                    const baseUrl = successfulConnection.url.split('/socket.io')[0];
                    logger.info(`Attempting to reconnect using working URL:`, { url: baseUrl });
                    
                    // Trigger reconnection with new URL
                    reconnect();
                  }
                }
              })
              .catch(err => {
                logger.error('Error testing connections:', { 
                  error: err instanceof Error ? err.message : String(err) 
                });
              });
          }
        }).catch(err => {
          logger.error('Error during connection testing:', { 
            error: err instanceof Error ? err.message : String(err) 
          });
        });
      }
    }
  }, [connectionState, config?.url, config?.path, socket]);
  
  // Provide socket context
  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected: connectionState === ConnectionState.CONNECTED,
        isConnecting: connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.RECONNECTING,
        error,
        connectionState,
        reconnect,
        disconnect
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
