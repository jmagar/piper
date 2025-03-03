"use client";

import { useCallback, useEffect, useState } from 'react';
import { useSocket } from '@/lib/socket-provider';
import { ExtendedChatMessage } from '@/types/chat';

// Define enum for connection state to maintain compatibility
enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

// Import types from socket.ts if needed for the hook
// These local types are no longer needed as they're defined in the socket.ts types file
// but keeping the interface names for code compatibility
type MessageChunk = {
  messageId: string;
  content: string;
  chunk: string;
  index: number;
  isLast: boolean;
  metadata?: Record<string, unknown>;
}

type MessageComplete = {
  messageId: string;
  metadata?: Record<string, unknown>;
}

type MessageError = {
  messageId: string;
  error: string;
  metadata?: Record<string, unknown>;
}

/**
 * Re-export ConnectionState enum from our types for backward compatibility
 */
export const SocketConnectionState = ConnectionState;

/**
 * Generic message interface for compatibility
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
 * Generic message response for compatibility
 * Keeping as a type definition for possible future use
 */
type GenericMessageResponse = {
  error?: string | undefined;
  message?: GenericMessage | undefined;
  [key: string]: unknown;
}

/**
 * Props for the useSocketIO hook
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
    isConnecting,
    error
  } = useSocket();
  
  // Create local state for connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    isConnected ? ConnectionState.CONNECTED : 
    isConnecting ? ConnectionState.CONNECTING : 
    ConnectionState.DISCONNECTED
  );
  
  // Update connection state when socket state changes
  useEffect(() => {
    if (isConnected) {
      setConnectionState(ConnectionState.CONNECTED);
    } else if (isConnecting) {
      setConnectionState(ConnectionState.CONNECTING);
    } else if (error) {
      setConnectionState(ConnectionState.FAILED);
    } else {
      setConnectionState(ConnectionState.DISCONNECTED);
    }
  }, [isConnected, isConnecting, error]);
  
  // Implement reconnect and disconnect functions
  const reconnect = useCallback(() => {
    // Attempt to reconnect by refreshing the page or reinitializing socket
    window.location.reload();
  }, []);
  
  const disconnect = useCallback(() => {
    // Close the socket if it exists
    if (socket) {
      socket.disconnect();
    }
  }, [socket]);
  
  const [lastMessage, setLastMessage] = useState<GenericMessage | null>(null);
  const [messages, setMessages] = useState<GenericMessage[]>([]);
  
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const cleanupFunctions: (() => void)[] = [];
    
    // Handle new messages
    const handleMessage = (message: ExtendedChatMessage) => {
      setLastMessage(message as GenericMessage);
      setMessages(prev => [...prev, message as GenericMessage]);
      
      if (props?.onMessage) {
        props.onMessage(message as GenericMessage);
      }
    };
    
    // Handle message chunks
    const handleMessageChunk = (data: any) => {
      if (props?.onMessageChunk) {
        props.onMessageChunk({
          messageId: data.messageId,
          chunk: data.content || data.chunk,
          metadata: data.metadata || undefined
        });
      }
    };
    
    // Handle message completion
    const handleMessageComplete = (data: any) => {
      if (props?.onMessageComplete) {
        props.onMessageComplete({
          messageId: typeof data === 'string' ? data : data.messageId,
          metadata: typeof data === 'object' ? data.metadata : undefined
        });
      }
    };
    
    // Handle message errors
    const handleMessageError = (data: any) => {
      if (props?.onMessageError) {
        props.onMessageError({
          messageId: data.messageId || 'unknown',
          error: typeof data === 'string' ? data : data.message || data.error || 'Unknown error',
          metadata: data.metadata || undefined
        });
      }
    };
    
    // Use onAny to catch all events for backward compatibility
    const handleAnyEvent = (event: string, ...args: unknown[]) => {
      console.log(`Socket event: ${event}`, args);
    };
    
    // Properly register event handlers with type safety
    socket.on('message:new', handleMessage as any);
    cleanupFunctions.push(() => socket.off('message:new', handleMessage as any));
    
    socket.on('message:chunk', handleMessageChunk as any);
    cleanupFunctions.push(() => socket.off('message:chunk', handleMessageChunk as any));
    
    socket.on('message:complete', handleMessageComplete as any);
    cleanupFunctions.push(() => socket.off('message:complete', handleMessageComplete as any));
    
    socket.on('message:error', handleMessageError as any);
    cleanupFunctions.push(() => socket.off('message:error', handleMessageError as any));
    
    // Use onAny to catch all events for backward compatibility
    socket.onAny(handleAnyEvent);
    cleanupFunctions.push(() => socket.offAny(handleAnyEvent));
    
    return () => {
      cleanupFunctions.forEach(fn => fn());
    };
  }, [socket, isConnected, props]);
  
  // Send message function
  const sendMessage = useCallback((message: GenericMessage | string) => {
    if (!socket || !isConnected) {
      console.error('Socket not connected');
      return false;
    }
    
    // Convert string to message object
    const messageCopy = typeof message === 'string' 
      ? { 
          content: message, 
          role: 'user' as const,
          id: `temp-${Date.now()}`
        } 
      : { ...message };
    
    // Add default values if not present
    if (!('id' in messageCopy) || !messageCopy.id) {
      messageCopy.id = `temp-${Date.now()}`;
    }
    
    // Socket callback function
    const socketCallback = (response: any) => {
      if (response.error) {
        console.error('Error sending message:', response.error);
      } else if (response.message) {
        console.log('Message sent successfully:', response.message);
      }
    };
    
    // Use the socket with the properly typed callback
    socket.emit('message:send', messageCopy as any, socketCallback as any);
    
    return true;
  }, [socket, isConnected]);
  
  // Return the same interface that was expected by the client code
  // Rename properties to match what's expected
  return {
    socket,
    isConnected,
    isConnecting,
    connectionState,
    error,
    messages,
    lastMessage,
    reconnect,
    disconnect,
    sendMessage
  };
} 