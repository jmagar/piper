"use client";

import * as React from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Component that creates a direct socket connection for testing
 * This bypasses all providers and connects directly to the socket server
 */
export function DirectSocketTest() {
  const [status, setStatus] = React.useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [socketId, setSocketId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const socketRef = React.useRef<Socket | null>(null);
  
  const connect = React.useCallback(() => {
    // Clean up existing socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    try {
      console.log('Creating direct socket connection to http://localhost:4100');
      setStatus('connecting');
      
      // Create socket with minimal options
      const socket = io('http://localhost:4100', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 20000,
        path: '/socket.io',
        auth: {
          userId: 'direct-test-user',
          username: 'Direct Test User',
          timestamp: Date.now()
        }
      });
      
      socketRef.current = socket;
      
      // Set up event listeners
      socket.on('connect', () => {
        console.log('Direct socket connected!', socket.id);
        setStatus('connected');
        setSocketId(socket.id || null);
        setError(null);
      });
      
      socket.on('connect_error', (err) => {
        console.error('Direct socket connect error:', err.message);
        setStatus('error');
        setError(err.message);
      });
      
      socket.on('disconnect', (reason) => {
        console.log('Direct socket disconnected:', reason);
        setStatus('disconnected');
        setSocketId(null);
      });
      
      // Connect
      socket.connect();
      
    } catch (err) {
      console.error('Error creating direct socket:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);
  
  // Connect when component mounts
  React.useEffect(() => {
    connect();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [connect]);
  
  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm">
      <h3 className="font-bold mb-2">Direct Socket Test</h3>
      
      <div className="flex items-center space-x-2 mb-2">
        <div 
          className={`w-3 h-3 rounded-full ${
            status === 'connected' ? 'bg-green-500' : 
            status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            status === 'error' ? 'bg-red-500' : 'bg-gray-500'
          }`}
        />
        <span>{status}</span>
        {socketId && <span className="text-gray-500 text-xs">({socketId})</span>}
      </div>
      
      {error && (
        <div className="text-red-500 text-xs mb-2">
          Error: {error}
        </div>
      )}
      
      <button 
        onClick={connect}
        className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Reconnect
      </button>
    </div>
  );
}