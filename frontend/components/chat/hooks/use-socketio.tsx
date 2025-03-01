"use client";

import { useCallback, useEffect, useState } from 'react';
import { useSocket } from '@/lib/socket/socket-provider';
import { 
  ConnectionState as SocketConnectionState, 
  MessageStatus,
  ChatMessage,
  MessageCallback,
  MessageChunk,
  MessageComplete,
  MessageError
} from '@/types/socket';

/**
 * Re-export ConnectionState enum from our types for backward compatibility
 */
export const ConnectionState = SocketConnectionState;

/**
 * Message type for generic message handling
 */
interface GenericMessage {
  id: string;
  content: string;
  role?: "user" | "assistant" | "system";
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  type?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Response type for our own callbacks
 */
interface GenericMessageResponse {
  error?: string | undefined;
  message?: GenericMessage | undefined;
  [key: string]: unknown;
}

/**
 * ChatMessage response from server
 */
interface ChatMessageResponse {
  error?: string;
  message?: ChatMessage;
}

/**
 * Socket handler props for useSocketIO hook
 */
interface UseSocketIOProps {
  /**
   * Handler for new messages
   */
  onMessage?: (message: GenericMessage) => void;
  
  /**
   * Handler for message chunks in streaming responses
   */
  onMessageChunk?: (data: {
    messageId: string;
    chunk: string;
    metadata?: Record<string, unknown> | undefined;
  }) => void;
  
  /**
   * Handler for message completion in streaming responses
   */
  onMessageComplete?: (data: {
    messageId: string;
    metadata?: Record<string, unknown> | undefined;
  }) => void;
  
  /**
   * Handler for message errors
   */
  onMessageError?: (data: {
    messageId: string;
    error: string;
    metadata?: Record<string, unknown> | undefined;
  }) => void;
}

/**
 * Compatibility hook for existing code that expects the useSocketIO interface
 * This works as an adapter between our new socket implementation and the old interface
 */
export function useSocketIO(props?: UseSocketIOProps) {
  const {
    socket,
    isConnected,
    connectionState,
    error,
    reconnect: socketReconnect,
    disconnect
  } = useSocket();
  
  const [lastMessage, setLastMessage] = useState<GenericMessage | null>(null);
  const [messages, setMessages] = useState<GenericMessage[]>([]);
  
  // Listen for messages
  useEffect(() => {
    if (!socket) return;
    
    const handleMessage = (message: ChatMessage) => {
      // Convert to generic message format
      const genericMessage: GenericMessage = {
        ...message,
        type: 'text',
        status: message.status as string
      };
      
      setLastMessage(genericMessage);
      setMessages((prev) => [genericMessage, ...prev].slice(0, 50)); // Limit to last 50 messages
      
      // Call the handler passed in props
      if (props?.onMessage) {
        props.onMessage(genericMessage);
      }
    };
    
    // Handle message chunks
    const handleMessageChunk = (data: MessageChunk) => {
      if (props?.onMessageChunk) {
        props.onMessageChunk({
          messageId: data.messageId,
          chunk: data.chunk,
          metadata: data.metadata || undefined
        });
      }
    };
    
    // Handle message completion
    const handleMessageComplete = (data: MessageComplete) => {
      if (props?.onMessageComplete) {
        props.onMessageComplete({
          messageId: data.messageId,
          metadata: data.metadata || undefined
        });
      }
    };
    
    // Handle message errors
    const handleMessageError = (data: MessageError) => {
      if (props?.onMessageError) {
        props.onMessageError({
          messageId: data.messageId,
          error: data.error,
          metadata: data.metadata || undefined
        });
      }
    };
    
    // Register event handlers
    const cleanupFunctions: Array<() => void> = [];
    
    // Properly register event handlers with type safety
    socket.on('message:new', handleMessage);
    cleanupFunctions.push(() => socket.off('message:new', handleMessage));
    
    socket.on('message:chunk', handleMessageChunk);
    cleanupFunctions.push(() => socket.off('message:chunk', handleMessageChunk));
    
    socket.on('message:complete', handleMessageComplete);
    cleanupFunctions.push(() => socket.off('message:complete', handleMessageComplete));
    
    socket.on('message:error', handleMessageError);
    cleanupFunctions.push(() => socket.off('message:error', handleMessageError));
    
    // Use onAny to catch all events for backward compatibility
    const handleAnyEvent = (event: string, ...args: unknown[]) => {
      if ((event === 'message' || event === 'message:update') && args.length > 0) {
        const message = args[0];
        if (typeof message === 'object' && message !== null && 'id' in message) {
          handleMessage(message as ChatMessage);
        }
      }
    };
    
    socket.onAny(handleAnyEvent);
    cleanupFunctions.push(() => socket.offAny(handleAnyEvent));
    
    return () => {
      cleanupFunctions.forEach(cleanup => {
        if (typeof cleanup === 'function') cleanup();
      });
    };
  }, [socket, props]);
  
  // Send message with compatibility layer
  const sendMessage = useCallback((message: GenericMessage, callback?: (response: GenericMessageResponse) => void) => {
    if (!socket || !isConnected) {
      if (callback) callback({ error: 'Socket not connected' });
      return false;
    }
    
    // Convert GenericMessage to proper format for socket emission
    // Create a copy without the index signature, ensuring status is a valid MessageStatus
    const messageCopy = {
      id: message.id,
      content: message.content,
      role: message.role || 'user',
      createdAt: message.createdAt || new Date().toISOString(),
      updatedAt: message.updatedAt || new Date().toISOString(),
      status: (message.status || 'sending') as MessageStatus,
      metadata: message.metadata || {}
    };

    // Create a correctly typed callback for Socket.IO
    const socketCallback: MessageCallback = (response) => {
      if (callback) {
        const genericResponse: GenericMessageResponse = {
          error: response.error,
          // Convert ChatMessage to GenericMessage if it exists
          message: response.message ? {
            ...response.message,
            // Ensure it has index signature capability
            status: response.message.status as string
          } : undefined
        };
        callback(genericResponse);
      }
    };

    // Use the socket with the properly typed callback
    socket.emit('message:send', messageCopy, socketCallback);
    
    return true;
  }, [socket, isConnected]);
  
  // Calculate isConnecting from connectionState
  const isConnecting = connectionState === ConnectionState.CONNECTING || 
                       connectionState === ConnectionState.RECONNECTING;
  
  // Return the same interface that was expected by the client code
  // Rename properties to match what's expected
  return {
    socket,
    isConnected,
    isConnecting,
    connectionState,
    connectionError: error,  // Rename error to connectionError
    messages,
    lastMessage,
    reconnect: socketReconnect,  // Rename connect to reconnect
    disconnect,
    sendMessage
  };
} 