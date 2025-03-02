"use client";

import { io, Socket } from 'socket.io-client';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getWebSocketUrl } from './env';

// Get WebSocket URL from environment
const SOCKET_URL = typeof window !== 'undefined' ? (window.env?.WEBSOCKET_URL || getWebSocketUrl()) : getWebSocketUrl();

// Define the socket context value type
interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

// Socket context with proper typing
const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize socket if not already done
    if (!socketRef.current) {
      try {
        // Create socket with reliable configuration
        console.log('[SOCKET] Connecting to WebSocket server at:', SOCKET_URL);
        const socket = io(SOCKET_URL, {
          path: '/socket.io',
          transports: ['polling', 'websocket'],
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 500,
          reconnectionDelayMax: 2000,
          timeout: 45000,
          forceNew: true,
          withCredentials: false,
          auth: {
            userId: 'test-user-1',
            username: 'Test User'
          }
        });
        
        socketRef.current = socket;

        // Connection events
        socket.on('connect', () => {
          console.log('[SOCKET] Connected successfully', socket.id);
          toast.success('Connected to chat server');
          setIsConnected(true);
          setIsConnecting(false);
          setError(null);
        });

        socket.on('disconnect', (reason) => {
          console.log('[SOCKET] Disconnected:', reason);
          setIsConnected(false);
          
          if (reason === 'io server disconnect' || reason === 'io client disconnect') {
            toast.error('Disconnected from chat server');
            setIsConnecting(false);
            setError('Disconnected from chat server');
          } else {
            toast.warning('Connection lost. Reconnecting...');
            setIsConnecting(true);
            setError('Connection lost. Reconnecting...');
          }
        });

        socket.on('connect_error', (err) => {
          console.error('[SOCKET] Connection error:', err.message);
          toast.error(`Connection error: ${err.message}`);
          setIsConnecting(true);
          setError(`Connection error: ${err.message}`);
        });

        socket.io.on('reconnect', () => {
          console.log('[SOCKET] Reconnected successfully');
          toast.success('Reconnected to chat server');
          setIsConnected(true);
          setIsConnecting(false);
          setError(null);
        });

        // Force connection
        socket.connect();
      } catch (err) {
        console.error('[SOCKET] Failed to initialize:', err);
        toast.error('Failed to initialize chat connection');
        setError('Failed to initialize chat connection');
        setIsConnecting(false);
      }
    }

    // Cleanup on unmount
    return () => {
      const socket = socketRef.current;
      if (socket) {
        console.log('[SOCKET] Cleaning up socket connection');
        socket.removeAllListeners();
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Provide socket and state to all consumers
  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      isConnected,
      isConnecting,
      error
    }}>
      {children}
    </SocketContext.Provider>
  );
}

// Hook to use socket with proper typing
export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  
  return context;
}

// Generic event callback type
type EventCallback<T = any> = (data: T) => void;

// Hook for listening to socket events
export function useSocketEvent<T = any>(
  eventName: string, 
  callback: EventCallback<T>, 
  deps: React.DependencyList = []
): void {
  const { socket } = useSocket();
  
  // Use a ref to avoid recreating the handler on each render
  const callbackRef = useRef(callback);
  
  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Set up event listener
  useEffect(() => {
    if (!socket) return;
    
    // Create handler that uses the latest callback
    const handler = (data: T) => {
      callbackRef.current(data);
    };
    
    // Add event listener
    socket.on(eventName, handler);
    
    // Cleanup
    return () => {
      socket.off(eventName, handler);
    };
  }, [socket, eventName, ...deps]);
}

// Hook for emitting socket events
export function useSocketEmit() {
  const { socket } = useSocket();
  
  return {
    emit: function<T = any>(
      event: string, 
      data: any, 
      waitForAck: boolean = false
    ): Promise<T> {
      if (!socket) {
        console.error(`[SOCKET] Cannot emit event: ${event} - socket not connected`);
        return Promise.reject(new Error('Socket not connected'));
      }
      
      if (waitForAck) {
        return new Promise<T>((resolve, reject) => {
          socket.emit(event, data, (response: any) => {
            if (response && response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response as T);
            }
          });
        });
      } else {
        socket.emit(event, data);
        return Promise.resolve({} as T);
      }
    }
  };
}