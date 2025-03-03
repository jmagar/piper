"use client";

import { io } from 'socket.io-client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getWebSocketUrl } from './env';

// Get WebSocket URL from environment
// Force use port 4100 which is where our backend is running
const SOCKET_URL = 'http://localhost:4100';

// Socket context
const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

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
            userId: 'admin',
            username: 'admin'
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

// Hook to use socket
export function useSocket() {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  
  return context;
}

// Hook for listening to socket events
export function useSocketEvent(eventName, callback, deps = []) {
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
    const handler = (...args) => {
      callbackRef.current(...args);
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
  
  return function emit(event, data, waitForAck = false) {
    if (!socket) {
      console.error(`[SOCKET] Cannot emit event: ${event} - socket not connected`);
      return Promise.reject(new Error('Socket not connected'));
    }
    
    if (waitForAck) {
      return new Promise((resolve, reject) => {
        socket.emit(event, data, (response) => {
          if (response && response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });
    } else {
      socket.emit(event, data);
      return Promise.resolve();
    }
  };
}