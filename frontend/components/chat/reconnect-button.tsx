"use client";

import React from 'react';
import { useSocket } from '@/lib/socket-setup.js';

/**
 * Button that shows connection status and allows users to reconnect
 */
export function ReconnectButton() {
  const { socket, isConnected, isConnecting, error } = useSocket();

  // Handle reconnect click with page reload fallback
  const handleReconnect = () => {
    if (!isConnected) {
      // First try to reconnect the socket
      console.log('[SOCKET] Manually attempting to reconnect...');
      
      if (socket) {
        socket.connect();
      }
      
      // Also add a fallback to refresh the page if reconnection fails
      setTimeout(() => {
        if (!isConnected) {
          console.log('[SOCKET] Reconnection failed, reloading page...');
          window.location.reload();
        }
      }, 3000);
    }
  };

  // Get connection state text
  const connectionState = isConnecting ? 'connecting' 
    : isConnected ? 'connected' 
    : error ? 'error'
    : 'disconnected';

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`h-3 w-3 rounded-full ${
          isConnected ? 'bg-green-500' : 
          isConnecting ? 'bg-yellow-500' : 
          'bg-red-500'
        }`}
        title={`Socket status: ${connectionState}`}
      />
      
      <button
        onClick={handleReconnect}
        disabled={isConnected || isConnecting}
        className={`px-3 py-1 text-sm rounded-md transition-colors ${
          isConnected || isConnecting
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Reconnect'}
      </button>
    </div>
  );
}