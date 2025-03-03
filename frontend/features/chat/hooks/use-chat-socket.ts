import * as React from 'react';
import { useSocket } from '@/lib/socket-provider';
import { useSocketEvent } from '@/lib/socket/use-socket-event';
import { useSocketEmit } from '@/lib/socket/use-socket-emit';
import type { ExtendedChatMessage } from '@/types/domain/chat';
import type { TypingIndicatorData, MessageChunk } from '@/types/socket';

/**
 * Hook for chat-specific socket functionality
 * 
 * This hook provides typed methods for interacting with chat-related socket events,
 * abstracting away the generic socket implementation.
 */
export function useChatSocket() {
  const { isConnected, isConnecting, error } = useSocket();
  // Create a local connectionState for compatibility
  const connectionState = React.useMemo(() => {
    if (isConnected) return 'connected';
    if (isConnecting) return 'connecting';
    if (error) return 'failed';
    return 'disconnected';
  }, [isConnected, isConnecting, error]);
  
  const emit = useSocketEmit();
  
  // Register event handlers for receiving messages
  const onNewMessage = React.useCallback(
    (callback: (message: ExtendedChatMessage) => void) => {
      // Type casting to handle the difference between ChatMessage and ExtendedChatMessage
      useSocketEvent('message:new', ((message: any) => {
        // Convert ChatMessage to ExtendedChatMessage if needed
        const extendedMessage: ExtendedChatMessage = {
          ...message,
          type: message.type || 'text', // Provide default if missing
          metadata: message.metadata || {}
        };
        callback(extendedMessage);
      }) as any);
    },
    []
  );
  
  const onMessageUpdate = React.useCallback(
    (callback: (message: ExtendedChatMessage) => void) => {
      // Type casting to handle the difference between ChatMessage and ExtendedChatMessage
      useSocketEvent('message:update', ((message: any) => {
        // Convert ChatMessage to ExtendedChatMessage if needed
        const extendedMessage: ExtendedChatMessage = {
          ...message,
          type: message.type || 'text', // Provide default if missing
          metadata: message.metadata || {}
        };
        callback(extendedMessage);
      }) as any);
    },
    []
  );
  
  const onMessageChunk = React.useCallback(
    (callback: (data: MessageChunk) => void) => {
      useSocketEvent('message:chunk', callback);
    },
    []
  );
  
  const onMessageComplete = React.useCallback(
    (callback: (data: { messageId: string; timestamp: string }) => void) => {
      useSocketEvent('message:complete', callback);
    },
    []
  );
  
  const onMessageError = React.useCallback(
    (callback: (data: { messageId: string; message: string }) => void) => {
      useSocketEvent('message:error', callback);
    },
    []
  );
  
  // Typing indicators
  const onUserTyping = React.useCallback(
    (callback: (data: TypingIndicatorData) => void) => {
      useSocketEvent('user:typing', callback);
    },
    []
  );
  
  const onUserStopTyping = React.useCallback(
    (callback: (data: TypingIndicatorData) => void) => {
      useSocketEvent('user:stop_typing', callback);
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