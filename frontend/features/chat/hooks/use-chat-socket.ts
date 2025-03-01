import * as React from 'react';
import { useSocket } from '@/lib/socket/socket-provider';
import { useSocketEvent } from '@/lib/socket/use-socket-event';
import { useSocketEmit } from '@/lib/socket/use-socket-emit';
import type { 
  ExtendedChatMessage, 
  MessageChunk
} from '@/types/domain/chat';

/**
 * Hook for chat-specific socket functionality
 * 
 * This hook provides typed methods for interacting with chat-related socket events,
 * abstracting away the generic socket implementation.
 */
export function useChatSocket() {
  const { isConnected, isConnecting, connectionState, error } = useSocket();
  const emit = useSocketEmit();
  
  // Register event handlers for receiving messages
  const onNewMessage = React.useCallback(
    (callback: (message: ExtendedChatMessage) => void) => {
      useSocketEvent<ExtendedChatMessage>('message:new', callback);
    },
    []
  );
  
  const onMessageUpdate = React.useCallback(
    (callback: (message: ExtendedChatMessage) => void) => {
      useSocketEvent<ExtendedChatMessage>('message:update', callback);
    },
    []
  );
  
  const onMessageChunk = React.useCallback(
    (callback: (data: MessageChunk) => void) => {
      useSocketEvent<MessageChunk>('message:chunk', callback);
    },
    []
  );
  
  const onMessageComplete = React.useCallback(
    (callback: (data: { messageId: string; metadata?: Record<string, unknown> }) => void) => {
      useSocketEvent<{ messageId: string; metadata?: Record<string, unknown> }>('message:complete', callback);
    },
    []
  );
  
  const onMessageError = React.useCallback(
    (callback: (data: { messageId: string; error: string }) => void) => {
      useSocketEvent<{ messageId: string; error: string }>('message:error', callback);
    },
    []
  );
  
  // Typing indicators
  const onUserTyping = React.useCallback(
    (callback: (user: { userId: string; username: string }) => void) => {
      useSocketEvent<{ userId: string; username: string }>('user:typing', callback);
    },
    []
  );
  
  const onUserStopTyping = React.useCallback(
    (callback: (user: { userId: string; username: string }) => void) => {
      useSocketEvent<{ userId: string; username: string }>('user:stop_typing', callback);
    },
    []
  );
  
  // Emit methods for sending messages
  const sendMessage = React.useCallback(
    (message: ExtendedChatMessage): Promise<ExtendedChatMessage> => {
      return emit<ExtendedChatMessage, ExtendedChatMessage>('message:sent', message, true);
    },
    [emit]
  );
  
  const updateMessage = React.useCallback(
    (message: ExtendedChatMessage): Promise<void> => {
      return emit<ExtendedChatMessage>('message:updated', message);
    },
    [emit]
  );
  
  // Typing indicators
  const sendTypingIndicator = React.useCallback(
    (): Promise<void> => {
      return emit('user:typing', {});
    },
    [emit]
  );
  
  const sendStopTypingIndicator = React.useCallback(
    (): Promise<void> => {
      return emit('user:stop_typing', {});
    },
    [emit]
  );
  
  return {
    // Connection status
    isConnected,
    isConnecting,
    connectionState,
    error,
    
    // Event listeners
    onNewMessage,
    onMessageUpdate,
    onMessageChunk,
    onMessageComplete,
    onMessageError,
    onUserTyping,
    onUserStopTyping,
    
    // Message methods
    sendMessage,
    updateMessage,
    sendTypingIndicator,
    sendStopTypingIndicator,
  };
} 