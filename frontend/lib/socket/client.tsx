'use client';

/**
 * Client-side socket implementation
 * 
 * This file provides client-side socket functionality with React hooks
 * for use in Next.js client components.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ConnectionState,
  Socket,
  SocketAuthOptions,
  SocketConnectionConfig
} from '@/types/socket';
import { createSocket, ConnectionManager } from './socket-core';

// Track singleton instances
let socketInstance: Socket | null = null;
let connectionManagerInstance: ConnectionManager | null = null;

// Context for socket state
interface SocketContextType {
  socket: Socket | null;
  connectionState: ConnectionState;
  isConnected: boolean;
  connect: (auth: SocketAuthOptions, config?: Partial<SocketConnectionConfig>) => void;
  disconnect: () => void;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connectionState: ConnectionState.DISCONNECTED,
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
  reconnect: () => {}
});

/**
 * Get singleton socket instance
 */
export function getSocket(): Socket | null {
  return socketInstance;
}

/**
 * Connect to socket server and get socket instance
 */
export function connectSocket(
  auth: SocketAuthOptions,
  config?: Partial<SocketConnectionConfig>
): {
  socket: Socket;
  connectionManager: ConnectionManager;
  disconnect: () => void;
  reconnect: () => void;
} {
  // Return existing singleton if already connected
  if (socketInstance && connectionManagerInstance) {
    return {
      socket: socketInstance,
      connectionManager: connectionManagerInstance,
      disconnect: () => {
        socketInstance?.disconnect();
      },
      reconnect: () => {
        socketInstance?.connect();
      }
    };
  }

  // Create new connection
  const { socket, connectionManager, disconnect, reconnect } = createSocket(auth, config);
  
  // Store singleton instances
  socketInstance = socket;
  connectionManagerInstance = connectionManager;
  
  return { socket, connectionManager, disconnect, reconnect };
}

/**
 * Socket provider props
 */
interface SocketProviderProps {
  children: React.ReactNode;
  initialAuth?: SocketAuthOptions | null;
  config?: Partial<SocketConnectionConfig>;
}

/**
 * Socket provider component for client components
 */
export function SocketProvider({
  children,
  initialAuth = null,
  config
}: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(socketInstance);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    connectionManagerInstance?.getState() || ConnectionState.DISCONNECTED
  );
  
  // Connect function 
  const connect = (auth: SocketAuthOptions, connectionConfig?: Partial<SocketConnectionConfig>) => {
    const { socket, connectionManager } = connectSocket(auth, connectionConfig || config);
    
    setSocket(socket);
    setConnectionState(connectionManager.getState());
    
    // Listen for state changes
    connectionManager.addListener((state) => {
      setConnectionState(state);
    });
  };
  
  // Disconnect function
  const disconnect = () => {
    if (socketInstance) {
      socketInstance.disconnect();
    }
  };
  
  // Reconnect function
  const reconnect = () => {
    if (socketInstance) {
      socketInstance.connect();
    }
  };
  
  // Connect with initial auth if provided
  useEffect(() => {
    if (initialAuth) {
      connect(initialAuth, config);
    }
    
    // Cleanup on unmount
    return () => {
      // Don't disconnect here as other components might be using the socket
      // Only clean up listeners
    };
  }, []);
  
  return (
    <SocketContext.Provider
      value={{
        socket,
        connectionState,
        isConnected: connectionState === ConnectionState.CONNECTED,
        connect,
        disconnect,
        reconnect
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

/**
 * Hook to use socket in client components
 */
export function useSocket() {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  
  return context;
}

/**
 * Hook to register socket event handlers
 */
export function useSocketEvent<K extends keyof import('@/types/socket').ServerToClientEvents>(
  eventName: K,
  handler: import('@/types/socket').ServerToClientEvents[K]
) {
  const { socket } = useSocket();
  
  useEffect(() => {
    if (!socket) return;
    
    // Register event handler
    socket.on(eventName, handler as any);
    
    // Cleanup
    return () => {
      socket.off(eventName, handler as any);
    };
  }, [socket, eventName, handler]);
}

/**
 * Hook to emit socket events
 */
export function useSocketEmit<K extends keyof import('@/types/socket').ClientToServerEvents>() {
  const { socket } = useSocket();
  
  return {
    emit: (
      eventName: K,
      ...args: Parameters<import('@/types/socket').ClientToServerEvents[K]>
    ) => {
      if (!socket) {
        console.error('Cannot emit event: Socket not connected');
        return;
      }
      
      socket.emit(eventName, ...args);
    }
  };
} 