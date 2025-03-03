"use client";

import * as React from 'react';
import { useSocket } from '@/lib/socket-provider';
import { useSocketEvent } from '@/lib/socket/use-socket-event';

/**
 * Simple component to handle socket events for chat messages
 */
export function SimpleSocketListener({ onNewMessage, onMessageChunk, onMessageComplete, onMessageError }) {
  const { socket, isConnected } = useSocket();
  
  // Register event handlers
  React.useEffect(() => {
    if (!socket) return;
    
    console.log('[SIMPLE SOCKET] Setting up event listeners');
    
    // Message handlers
    socket.on('message', (message) => {
      console.log('[SIMPLE SOCKET] Message received:', message);
      if (onNewMessage) onNewMessage(message);
    });
    
    socket.on('message:chunk', (data) => {
      console.log('[SIMPLE SOCKET] Message chunk received:', data);
      if (onMessageChunk) onMessageChunk(data);
    });
    
    socket.on('message:complete', (data) => {
      console.log('[SIMPLE SOCKET] Message complete:', data);
      if (onMessageComplete) onMessageComplete(data);
    });
    
    socket.on('message:error', (data) => {
      console.log('[SIMPLE SOCKET] Message error:', data);
      if (onMessageError) onMessageError(data);
    });
    
    // Debug handlers
    socket.on('connect', () => {
      console.log('[SIMPLE SOCKET] Connected event received');
    });
    
    socket.on('disconnect', (reason) => {
      console.log('[SIMPLE SOCKET] Disconnected:', reason);
    });
    
    // Cleanup
    return () => {
      console.log('[SIMPLE SOCKET] Cleaning up event listeners');
      socket.off('message');
      socket.off('message:chunk');
      socket.off('message:complete');
      socket.off('message:error');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [socket, onNewMessage, onMessageChunk, onMessageComplete, onMessageError]);
  
  // Socket status display
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black bg-opacity-70 text-white p-2 rounded text-xs">
      Socket: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
    </div>
  );
}

/**
 * Hook to emit socket events
 */
export function useSocketSend() {
  const { socket, isConnected } = useSocket();
  
  const sendMessage = React.useCallback((message) => {
    if (!socket || !isConnected) {
      console.error('[SOCKET SEND] Cannot send message - socket not connected');
      return Promise.reject('Socket not connected');
    }
    
    return new Promise((resolve, reject) => {
      socket.emit('message:sent', message, (response) => {
        if (response && response.error) {
          reject(response.error);
        } else {
          resolve(response);
        }
      });
    });
  }, [socket, isConnected]);
  
  return { sendMessage };
}