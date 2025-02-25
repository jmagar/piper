import * as React from 'react';

import { useSocket } from '@/lib/socket';
import type { ExtendedChatMessage } from '@/types/chat';

interface MessageChunkData {
  messageId: string;
  chunk: string;
  status?: 'streaming';
  metadata?: Record<string, unknown>;
}

interface MessageCompleteData {
  messageId: string;
  metadata?: Record<string, unknown>;
}

interface MessageErrorData {
  messageId: string;
  error: string;
}

/**
 * Hook for handling chat socket events
 */
export function useChatSocket() {
  const { socket, isConnected } = useSocket();

  const connect = React.useCallback(() => {
    socket?.connect();
  }, [socket]);

  // Message events
  const onNewMessage = React.useCallback((callback: (message: ExtendedChatMessage) => void) => {
    socket?.on('message:new', callback);
    return () => socket?.off('message:new', callback);
  }, [socket]);

  const onMessageUpdate = React.useCallback((callback: (message: ExtendedChatMessage) => void) => {
    socket?.on('message:update', callback);
    return () => socket?.off('message:update', callback);
  }, [socket]);

  const onMessageChunk = React.useCallback((callback: (data: MessageChunkData) => void) => {
    socket?.on('message:chunk', callback);
    return () => socket?.off('message:chunk', callback);
  }, [socket]);

  const onMessageComplete = React.useCallback((callback: (data: MessageCompleteData) => void) => {
    socket?.on('message:complete', callback);
    return () => socket?.off('message:complete', callback);
  }, [socket]);

  const onMessageError = React.useCallback((callback: (data: MessageErrorData) => void) => {
    socket?.on('message:error', callback);
    return () => socket?.off('message:error', callback);
  }, [socket]);

  // User events
  const onUserTyping = React.useCallback((callback: (user: { userId: string; username: string }) => void) => {
    socket?.on('user:typing', callback);
    return () => socket?.off('user:typing', callback);
  }, [socket]);

  const onUserStopTyping = React.useCallback((callback: (user: { userId: string; username: string }) => void) => {
    socket?.on('user:stop_typing', callback);
    return () => socket?.off('user:stop_typing', callback);
  }, [socket]);

  // Send messages
  const sendMessage = React.useCallback((message: ExtendedChatMessage): Promise<ExtendedChatMessage> => {
    return new Promise((resolve, reject) => {
      if (!socket || !isConnected) {
        reject(new Error('Not connected to chat server'));
        return;
      }

      socket.emit('message:sent', message, (response: { error?: string; message?: ExtendedChatMessage }) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }

        if (response.message) {
          resolve(response.message);
        } else {
          reject(new Error('No message returned from server'));
        }
      });
    });
  }, [socket, isConnected]);

  return {
    socket,
    isConnected,
    connect,
    onNewMessage,
    onMessageUpdate,
    onMessageChunk,
    onMessageComplete,
    onMessageError,
    onUserTyping,
    onUserStopTyping,
    sendMessage
  };
}