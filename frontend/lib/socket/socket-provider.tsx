import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  SocketAuthOptions,
  SocketConnectionConfig,
  ConnectionState,
  Socket,
  ChatMessage,
  MessageChunk,
  MessageComplete,
  MessageError,
  TypingData,
  MessageStatus,
  StreamStatus,
  MessageMetadata
} from '@/types/socket';
import { createSocket, SocketEventHandlers, registerSocketEvent, emitWithPromise } from './socket-core';
import { toast } from 'sonner';

/**
 * Socket context state
 */
interface SocketContextState {
  // Connection state
  socket: Socket | null;
  connectionState: ConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  connectionAttempts: number;
  
  // Connection control
  connect: (auth: SocketAuthOptions, config?: SocketConnectionConfig) => void;
  disconnect: () => void;
  reconnect: () => void;
  
  // Message handlers
  sendMessage: (message: string, metadata?: Record<string, unknown>) => Promise<{ id: string }>;
  updateMessage: (id: string, message: string) => Promise<void>;
  cancelMessage: (id: string) => Promise<void>;
  
  // Typing indicators
  sendTypingStart: (conversationId: string) => void;
  sendTypingStop: (conversationId: string) => void;
  
  // Active data
  messages: ChatMessage[];
  typingUsers: Map<string, TypingData>;
  activeStreams: Set<string>;
}

// Default context state
const defaultState: SocketContextState = {
  socket: null,
  connectionState: ConnectionState.DISCONNECTED,
  isConnected: false,
  isConnecting: false,
  error: null,
  connectionAttempts: 0,
  
  connect: () => Promise.resolve(),
  disconnect: () => {},
  reconnect: () => {},
  
  sendMessage: () => Promise.resolve({ id: '' }),
  updateMessage: () => Promise.resolve(),
  cancelMessage: () => Promise.resolve(),
  
  sendTypingStart: () => {},
  sendTypingStop: () => {},
  
  messages: [],
  typingUsers: new Map(),
  activeStreams: new Set()
};

// Create context
export const SocketContext = createContext<SocketContextState>(defaultState);

/**
 * Socket provider props
 */
interface SocketProviderProps {
  children: React.ReactNode;
  auth: SocketAuthOptions;
  config?: {
    autoConnect?: boolean;
    showToasts?: boolean;
    url?: string;
    path?: string;
  };
}

/**
 * Socket provider component
 * Provides socket connection and related functionality to child components
 */
export function SocketProvider({
  children,
  auth,
  config = {}
}: SocketProviderProps) {
  const { 
    autoConnect = true,
    showToasts = true,
    url,
    path
  } = config;
  
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<Error | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Use refs for mutable state that doesn't need re-renders
  const socketRef = useRef<Socket | null>(null);
  const connectionManagerRef = useRef<ReturnType<typeof createSocket>['connectionManager'] | null>(null);
  const disconnectFnRef = useRef<() => void>(() => {});
  const reconnectFnRef = useRef<() => void>(() => {});
  const typingUsersRef = useRef<Map<string, TypingData>>(new Map());
  const activeStreamsRef = useRef<Set<string>>(new Set());
  
  // Create typing indicator timers map
  const typingTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Cleanup function for event listeners
  const cleanupRef = useRef<Array<() => void>>([]);
  
  // Connect to socket
   
  const connect = useCallback((auth: SocketAuthOptions, config?: SocketConnectionConfig) => {
    // Clean up previous connection if exists
    if (socketRef.current) {
      disconnect();
    }
    
    // Define event handlers
    const eventHandlers: SocketEventHandlers = {
      onConnect: (socket) => {
        console.log('Socket connected:', socket.id);
        if (showToasts) {
          toast.success('Socket connection established', {
            id: 'socket-connected',
            duration: 3000
          });
        }
      },
      onDisconnect: (reason) => {
        console.log('Socket disconnected:', reason);
        if (showToasts && reason !== 'io client disconnect') {
          toast.warning(`Socket disconnected: ${reason}`, {
            id: 'socket-disconnected',
            duration: 5000
          });
        }
      },
      onConnectError: (err) => {
        console.error('Socket connection error:', err.message);
        setError(err);
        if (showToasts) {
          toast.error(`Connection error: ${err.message}`, {
            id: 'socket-error',
            duration: 5000
          });
        }
      },
      onReconnectAttempt: (attempt) => {
        console.log('Socket reconnection attempt:', attempt);
        setConnectionAttempts(attempt);
      },
      onReconnectFailed: () => {
        console.error('Socket reconnection failed');
        if (showToasts) {
          toast.error('Failed to reconnect after multiple attempts', {
            id: 'socket-reconnect-failed',
            duration: 5000
          });
        }
      },
      onError: (err) => {
        console.error('Socket error:', err.message);
        setError(err);
      }
    };
    
    // Create socket instance
    const { socket, connectionManager, disconnect: disconnectFn, reconnect: reconnectFn } = createSocket(
      auth,
      config,
      eventHandlers
    );
    
    // Store references
    socketRef.current = socket;
    connectionManagerRef.current = connectionManager;
    disconnectFnRef.current = disconnectFn;
    reconnectFnRef.current = reconnectFn;
    
    // Add state listener
    const removeStateListener = connectionManager.addListener((state) => {
      setConnectionState(state);
      setError(connectionManager.getError());
      setConnectionAttempts(connectionManager.getReconnectAttempts());
    });
    
    // Register event listeners
    const cleanupFunctions: Array<() => void> = [removeStateListener];
    
    // Message received handler - update to match ServerToClientEvents
    cleanupFunctions.push(
      registerSocketEvent(socket, 'message:new', (message: ChatMessage) => {
        setMessages((prev) => [...prev, message]);
      })
    );
    
    // Message updated handler - update to match ServerToClientEvents
    cleanupFunctions.push(
      registerSocketEvent(socket, 'message:update', (message: ChatMessage) => {
        setMessages((prev) => 
          prev.map((msg) => (msg.id === message.id ? message : msg))
        );
      })
    );
    
    // Message chunk handler - update to match MessageChunk type
    cleanupFunctions.push(
      registerSocketEvent(socket, 'message:chunk', (chunk: MessageChunk) => {
        const { messageId, chunk: content } = chunk;
        
        // Track active stream
        activeStreamsRef.current.add(messageId);
        
        setMessages((prev) => {
          const existingMessage = prev.find(msg => msg.id === messageId);
          
          // If message doesn't exist yet, create a new one
          if (!existingMessage) {
            const newMessage: ChatMessage = {
              id: messageId,
              content,
              role: 'assistant', // Default role
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              status: 'streaming',
              metadata: {
                streamStatus: 'streaming',
                timestamp: new Date().toISOString()
              }
            };
            return [...prev, newMessage];
          }
          
          // Otherwise update existing message
          return prev.map((msg) => {
            if (msg.id === messageId) {
              return {
                ...msg,
                content: msg.content + content,
                status: 'streaming' as MessageStatus,
                updatedAt: new Date().toISOString(),
                metadata: {
                  ...msg.metadata,
                  streamStatus: 'streaming' as StreamStatus
                }
              };
            }
            return msg;
          });
        });
      })
    );
    
    // Message complete handler - update to match MessageComplete type
    cleanupFunctions.push(
      registerSocketEvent(socket, 'message:complete', (data: MessageComplete) => {
        const { messageId } = data;
        
        // Remove from active streams
        activeStreamsRef.current.delete(messageId);
        
        setMessages((prev) => 
          prev.map((msg) => {
            if (msg.id === messageId) {
              return {
                ...msg,
                status: 'sent',
                updatedAt: new Date().toISOString(),
                metadata: {
                  ...msg.metadata,
                  ...(data.metadata || {}),
                  streamStatus: 'complete',
                  streamEndTime: data.metadata?.streamEndTime || new Date().toISOString()
                }
              };
            }
            return msg;
          })
        );
      })
    );
    
    // Message error handler - update to match MessageError type
    cleanupFunctions.push(
      registerSocketEvent(socket, 'message:error', (error: MessageError) => {
        const { messageId, error: errorMessage } = error;
        
        // Remove from active streams
        activeStreamsRef.current.delete(messageId);
        
        console.error(`Message error for ${messageId}:`, errorMessage);
        
        setMessages((prev) => 
          prev.map((msg) => {
            if (msg.id === messageId) {
              return {
                ...msg,
                status: 'error',
                updatedAt: new Date().toISOString(),
                metadata: {
                  ...msg.metadata,
                  streamStatus: 'error',
                  error: errorMessage,
                  errorTime: new Date().toISOString()
                }
              };
            }
            return msg;
          })
        );
      })
    );
    
    // User typing handler - update to match TypingData type
    cleanupFunctions.push(
      registerSocketEvent(socket, 'user:typing', (data: TypingData) => {
        const { userId, username: _username, conversationId: _conversationId } = data;
        
        // Add typing user
        typingUsersRef.current.set(userId, data);
        
        // Clear existing timer if any
        if (typingTimersRef.current.has(userId)) {
          clearTimeout(typingTimersRef.current.get(userId));
        }
        
        // Set timeout to remove typing indicator after 3 seconds of no updates
        const timerId = setTimeout(() => {
          typingUsersRef.current.delete(userId);
          typingTimersRef.current.delete(userId);
        }, 3000);
        
        typingTimersRef.current.set(userId, timerId);
      })
    );
    
    // Store cleanup functions
    cleanupRef.current = cleanupFunctions;
    
    return socket;
  }, []);
  
  // Disconnect from socket
  const disconnect = useCallback(() => {
    // Clean up all event listeners
    cleanupRef.current.forEach((cleanup) => cleanup());
    cleanupRef.current = [];
    
    // Clean up typing timers
    typingTimersRef.current.forEach((timer) => clearTimeout(timer));
    typingTimersRef.current.clear();
    
    // Disconnect socket
    if (disconnectFnRef.current) {
      disconnectFnRef.current();
    }
    
    // Clear state
    socketRef.current = null;
    activeStreamsRef.current.clear();
    typingUsersRef.current.clear();
  }, []);
  
  // Reconnect to socket
  const reconnect = useCallback(() => {
    if (reconnectFnRef.current) {
      reconnectFnRef.current();
    }
  }, []);
  
  // Send a new message
  const sendMessage = useCallback(
    async (message: string, metadata?: Record<string, unknown>): Promise<{ id: string }> => {
      if (!socketRef.current) {
        throw new Error('Socket not connected');
      }
      
      const chatMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        content: message,
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'sending',
        userId: auth.userId,
        username: auth.username,
        metadata: metadata as MessageMetadata || {} as MessageMetadata
      };
      
      try {
        const response = await emitWithPromise<'message:send', { message?: { id: string } }>(
          socketRef.current, 
          'message:send', 
          chatMessage
        );
        
        // Safely extract the message ID with fallback
        return { id: response?.message?.id || chatMessage.id };
      } catch (error) {
        console.error('Error sending message:', error);
        return { id: chatMessage.id };
      }
    },
    [auth]
  );
  
  // Update an existing message
  const updateMessage = useCallback(
    async (id: string, content: string): Promise<void> => {
      if (!socketRef.current) {
        throw new Error('Socket not connected');
      }
      
      const updatedMessage: ChatMessage = {
        id,
        content,
        role: 'user', // Default, will be overwritten by the existing message on the server
        createdAt: new Date().toISOString(), // Use current time, will be preserved on server
        updatedAt: new Date().toISOString(),
        status: 'sent',
        userId: auth.userId,
        metadata: {
          updatedAt: new Date().toISOString()
        }
      };
      
      try {
        await emitWithPromise<'message:update', void>(
          socketRef.current, 
          'message:update', 
          updatedMessage
        );
      } catch (error) {
        console.error('Error updating message:', error);
        throw error;
      }
    },
    [auth]
  );
  
  // Cancel a message (especially useful for streaming)
  const cancelMessage = useCallback(
    async (id: string): Promise<void> => {
      if (!socketRef.current) {
        throw new Error('Socket not connected');
      }
      
      // Since 'message:cancel' is not in the API, let's update the message status instead
      const cancelledMessage: ChatMessage = {
        id,
        content: '',  // Will be preserved on server
        role: 'user',  // Will be preserved on server
        createdAt: new Date().toISOString(), // Use current time
        updatedAt: new Date().toISOString(),
        status: 'error',
        userId: auth.userId,
        metadata: {
          error: 'Message cancelled by user',
          cancelledAt: new Date().toISOString()
        }
      };
      
      try {
        await emitWithPromise<'message:update', void>(
          socketRef.current, 
          'message:update', 
          cancelledMessage
        );
      } catch (error) {
        console.error('Error cancelling message:', error);
        throw error;
      }
    },
    [auth]
  );
  
  // Emit typing event correctly
  const sendTypingStart = useCallback(
    (conversationId: string) => {
      if (!socketRef.current) {
        return;
      }
      
      socketRef.current.emit('user:typing', {
        userId: auth.userId,
        username: auth.username,
        conversationId,
        timestamp: new Date().toISOString()
      });
    },
    [auth]
  );
  
  // Emit stop typing event
  const sendTypingStop = useCallback(
    (conversationId: string) => {
      if (!socketRef.current) {
        return;
      }
      
      socketRef.current.emit('user:stop_typing', {
        userId: auth.userId,
        username: auth.username,
        conversationId,
        timestamp: new Date().toISOString()
      });
    },
    [auth]
  );
  
  // Auto-connect if configured
  useEffect(() => {
    if (autoConnect) {
      // Ensure we're using a proper SocketConnectionConfig
      const connectionConfig: SocketConnectionConfig = {};
      if (url) connectionConfig.url = url;
      if (path) connectionConfig.path = path;
      
      connect(auth, connectionConfig);
    }
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, auth, url, path, disconnect]);
  
  // Prepare context value
  const contextValue: SocketContextState = {
    socket: socketRef.current,
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED,
    isConnecting: connectionState === ConnectionState.CONNECTING || 
                 connectionState === ConnectionState.RECONNECTING,
    error,
    connectionAttempts,
    
    connect,
    disconnect,
    reconnect,
    
    sendMessage,
    updateMessage,
    cancelMessage,
    
    sendTypingStart,
    sendTypingStop,
    
    messages,
    typingUsers: typingUsersRef.current,
    activeStreams: activeStreamsRef.current
  };
  
  return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
}

/**
 * Hook to use the socket context
 * @returns Socket context state
 * @throws Error if used outside of a SocketProvider
 */
export const useSocket = (): SocketContextState => {
  const context = useContext(SocketContext);
  
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  
  return context;
}; 