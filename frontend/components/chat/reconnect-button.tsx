"use client";

import * as React from 'react';
import { useSocket } from '@/lib/socket/socket-provider';

/**
 * Client component button for manual socket reconnection
 */
export function ReconnectButton() {
  const { reconnect, isConnected } = useSocket();
  
  return (
    <button 
      onClick={() => {
        try {
          // First try using the context's reconnect function
          reconnect();
          console.log('Manual reconnection triggered via context');
        } catch (err) {
          console.error('Failed to reconnect via context:', err);
          
          // Fall back to global reconnect function if available
          try {
            const socket = window.__socketReconnect?.();
            if (socket) {
              console.log('Manual reconnection triggered via global function');
            } else {
              console.error('Socket reconnect function not available');
              window.location.reload();
            }
          } catch (err) {
            console.error('Failed to reconnect socket:', err);
            window.location.reload();
          }
        }
      }}
      className={`px-3 py-1 rounded text-sm transition-colors ${
        isConnected 
          ? 'bg-green-600 text-white hover:bg-green-700' 
          : 'bg-red-600 text-white hover:bg-red-700'
      }`}
    >
      {isConnected ? 'Connected ✓' : 'Reconnect Socket'}
    </button>
  );
} 