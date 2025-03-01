"use client";

import * as React from 'react';
import { useSocket } from '@/lib/socket';
import { getWebSocketUrl } from '@/lib/env';

/**
 * A debug panel for Socket.IO connection status and environment variables
 * This helps troubleshoot socket connection issues
 */
export function SocketDebugPanel() {
  const {
    socket,
    isConnected,
    isConnecting,
    error: socketError
  } = useSocket();
  
  const [socketDetails, setSocketDetails] = React.useState<any>(null);
  const [envVars, setEnvVars] = React.useState<Record<string, string>>({});
  
  // Fetch environment variables
  React.useEffect(() => {
    // Get from window.env if available (from EnvProvider)
    if (typeof window !== 'undefined' && window.env) {
      setEnvVars(window.env);
    } else {
      // Otherwise use our utility function
      setEnvVars({
        NEXT_PUBLIC_WEBSOCKET_URL: getWebSocketUrl(),
        // Add any other relevant env vars here
      });
    }
  }, []);
  
  // Get socket details
  React.useEffect(() => {
    if (socket) {
      setSocketDetails({
        id: socket.id,
        connected: socket.connected,
        disconnected: socket.disconnected,
        // Avoid accessing private properties
        namespace: (socket as any).nsp?.name,
        auth: socket.auth,
        io: {
          // Use a different approach to get connection info
          engine: (socket as any).io?.engine?.transport?.name || 'unknown',
          url: (socket as any).io?._opts?.uri || 'unknown'
        }
      });
    } else {
      setSocketDetails(null);
    }
  }, [socket, isConnected]);
  
  // Force a reconnection
  const handleReconnect = () => {
    console.log('Manually triggering socket reconnection...');
    if (socketReconnect) {
      socketReconnect();
    } else {
      console.error('No reconnect function available');
    }
  };
  
  // Force a direct connection
  const handleDirectConnect = () => {
    try {
      if (typeof window !== 'undefined') {
        const WEBSOCKET_URL = envVars.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:4100';
        console.log(`Attempting direct connection to ${WEBSOCKET_URL}...`);
        
        // Create a new socket directly
        // @ts-ignore - importing io directly here
        const io = window.io || require('socket.io-client');
        const directSocket = io(WEBSOCKET_URL, {
          transports: ['polling', 'websocket'],
          path: '/socket.io',
          reconnection: true,
          autoConnect: true,
          auth: {
            userId: 'debug-user',
            username: 'Debug User',
            timestamp: Date.now()
          }
        });
        
        // Log connection
        directSocket.on('connect', () => {
          console.log('Direct socket connection successful!', directSocket.id);
          alert(`Direct socket connection successful! ID: ${directSocket.id}`);
        });
        
        directSocket.on('connect_error', (err: any) => {
          console.error('Direct socket connection error:', err);
          alert(`Direct socket connection error: ${err.message}`);
        });
        
        // Attempt connection
        directSocket.connect();
      }
    } catch (err) {
      console.error('Error creating direct socket:', err);
      alert(`Error creating direct socket: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  return (
    <div className="bg-black text-green-500 font-mono text-xs p-4 rounded-md shadow-lg max-w-2xl mx-auto my-4 border border-green-500 overflow-auto">
      <h2 className="text-lg font-bold mb-2">Socket Debug Panel</h2>
      
      <div className="mb-4">
        <h3 className="text-sm font-bold mb-1">Environment Variables:</h3>
        <pre className="bg-gray-900 p-2 rounded overflow-auto">
          {JSON.stringify(envVars, null, 2)}
        </pre>
      </div>
      
      <div className="mb-4">
        <h3 className="text-sm font-bold mb-1">Socket Connection:</h3>
        <div className="flex items-center space-x-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <div className="mb-2">Connection State: <span className="text-yellow-400">{connectionState}</span></div>
        {socketError && (
          <div className="mb-2 text-red-400">Error: {socketError}</div>
        )}
      </div>
      
      {socketDetails && (
        <div className="mb-4">
          <h3 className="text-sm font-bold mb-1">Socket Details:</h3>
          <pre className="bg-gray-900 p-2 rounded overflow-auto">
            {JSON.stringify(socketDetails, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="flex space-x-2">
        <button 
          onClick={handleReconnect} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
        >
          Reconnect Socket
        </button>
        <button 
          onClick={handleDirectConnect} 
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
        >
          Direct Connect
        </button>
      </div>
    </div>
  );
}