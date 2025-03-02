"use client";

import React from 'react';
import { useSocket } from '@/lib/socket/client';

/**
 * Button that shows connection status and allows users to reconnect
 */
export function ReconnectButton() {
  const { isConnected, connectionState, reconnect } = useSocket();

  // Handle reconnect click
  const handleReconnect = () => {
    if (!isConnected) {
      reconnect();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`h-3 w-3 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
        title={`Socket status: ${connectionState}`}
      />
      
      <button
        onClick={handleReconnect}
        disabled={isConnected}
        className={`px-3 py-1 text-sm rounded-md transition-colors ${
          isConnected 
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {isConnected ? 'Connected' : 'Reconnect'}
      </button>
    </div>
  );
} 