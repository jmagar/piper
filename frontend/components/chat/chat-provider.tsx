'use client';

import React, { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
import { ExtendedChatMessage } from '@/types/chat';
import { Socket } from 'socket.io-client';
import { useSocket, useSocketEvent } from '@/lib/socket-setup.js';
import { toast } from 'sonner';

// Chat state
interface ChatState {
  messages: ExtendedChatMessage[];
  input: string;
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
}

// Initial state
const initialState: ChatState = {
  messages: [],
  input: '',
  isLoading: false,
  error: null,
  conversationId: null,
};

// Action types
type ChatAction =
  | { type: 'SET_MESSAGES'; messages: ExtendedChatMessage[] }
  | { type: 'ADD_MESSAGE'; message: ExtendedChatMessage }
  | { type: 'UPDATE_MESSAGE'; message: ExtendedChatMessage }
  | { type: 'SET_INPUT'; input: string }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_CONVERSATION_ID'; conversationId: string };

// Chat reducer
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_MESSAGES':
      return { ...state, messages: action.messages };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.message.id ? action.message : msg
        ),
      };
    case 'SET_INPUT':
      return { ...state, input: action.input };
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'SET_CONVERSATION_ID':
      return { ...state, conversationId: action.conversationId };
    default:
      return state;
  }
}

// Create context
const ChatContext = createContext<
  | {
      state: ChatState;
      dispatch: React.Dispatch<ChatAction>;
      sendMessage: (content: string) => Promise<void>;
      loadMessages: () => Promise<void>;
    }
  | undefined
>(undefined);

// Chat provider props
interface ChatProviderProps {
  children: React.ReactNode;
  initialMessages?: ExtendedChatMessage[];
  conversationId?: string;
}

/**
 * Chat provider component
 */
export function ChatProvider({
  children,
  initialMessages = [],
  conversationId,
}: ChatProviderProps) {
  // Initialize reducer with initial state
  const [state, dispatch] = useReducer(chatReducer, {
    ...initialState,
    messages: initialMessages,
    conversationId: conversationId || null,
  });

  // Get socket functionality
  const { socket, isConnected } = useSocket();

  // Set up socket event handlers
  React.useEffect(() => {
    if (!socket) return;
    
    const messageNewHandler = (message: ExtendedChatMessage) => {
      dispatch({ type: 'ADD_MESSAGE', message });
    };

    const messageUpdateHandler = (message: ExtendedChatMessage) => {
      dispatch({ type: 'UPDATE_MESSAGE', message });
    };

    const messageErrorHandler = (data: { messageId: string, error: string }) => {
      dispatch({ type: 'SET_ERROR', error: data.error });
      
      // Update message status if it exists
      const message = state.messages.find(m => m.id === data.messageId);
      if (message) {
        dispatch({
          type: 'UPDATE_MESSAGE',
          message: { ...message, status: 'error', metadata: { ...message.metadata, error: data.error } }
        });
      }
    };
    
    // Add handler for message chunks during streaming
    const messageChunkHandler = (data: { messageId: string, chunk: string, timestamp: string }) => {
      // Find the temporary message to update or create a new assistant message
      const tempMessage = state.messages.find(m => m.id === data.messageId);
      
      if (tempMessage) {
        // This chunk is for an existing message - append to content
        dispatch({
          type: 'UPDATE_MESSAGE',
          message: {
            ...tempMessage,
            content: tempMessage.content + data.chunk,
            status: 'streaming',
            metadata: { 
              ...tempMessage.metadata,
              lastChunkAt: data.timestamp,
            }
          }
        });
      } else {
        // Create a new message for the assistant's response
        const assistantMessage: ExtendedChatMessage = {
          id: data.messageId || `response-${Date.now()}`,
          role: 'assistant',
          content: data.chunk,
          createdAt: data.timestamp || new Date().toISOString(),
          type: 'text',
          status: 'streaming',
          metadata: {
            timestamp: Date.now(),
            lastChunkAt: data.timestamp,
          },
        };
        
        dispatch({ type: 'ADD_MESSAGE', message: assistantMessage });
      }
    };
    
    // Add handler for message completion
    const messageCompleteHandler = (data: { messageId: string, timestamp: string }) => {
      // Find the message that's being completed
      const message = state.messages.find(m => m.id === data.messageId);
      
      if (message) {
        // Update the message status to complete
        dispatch({
          type: 'UPDATE_MESSAGE',
          message: {
            ...message,
            status: 'delivered',
            metadata: { 
              ...message.metadata,
              completedAt: data.timestamp,
            }
          }
        });
      }
    };
    
    // Add typing indicator handlers
    const userTypingHandler = (data: { userId: string, username: string }) => {
      console.log('User typing:', data.username);
      // Could add typing indicator UI here
    };
    
    const userStopTypingHandler = (data: { userId: string, username: string }) => {
      console.log('User stopped typing:', data.username);
      // Could remove typing indicator UI here
    };
    
    // Add event listeners
    socket.on('message:new', messageNewHandler);
    socket.on('message:update', messageUpdateHandler);
    socket.on('message:error', messageErrorHandler);
    socket.on('message:chunk', messageChunkHandler);
    socket.on('message:complete', messageCompleteHandler);
    socket.on('user:typing', userTypingHandler);
    socket.on('user:stop_typing', userStopTypingHandler);
    
    // Cleanup on unmount
    return () => {
      socket.off('message:new', messageNewHandler);
      socket.off('message:update', messageUpdateHandler);
      socket.off('message:error', messageErrorHandler);
      socket.off('message:chunk', messageChunkHandler);
      socket.off('message:complete', messageCompleteHandler);
      socket.off('user:typing', userTypingHandler);
      socket.off('user:stop_typing', userStopTypingHandler);
    };
  }, [socket, state.messages]);

  // Send a message through socket
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !isConnected) return;

      // Clear input
      dispatch({ type: 'SET_INPUT', input: '' });
      dispatch({ type: 'SET_LOADING', isLoading: true });

      try {
        // Create a temporary message
        const tempMessage: ExtendedChatMessage = {
          id: `temp-${Date.now()}`,
          role: 'user',
          content,
          createdAt: new Date().toISOString(),
          type: 'text',
          status: 'sending',
          metadata: {
            timestamp: Date.now(),
          },
        };

        // Add to local state
        dispatch({ type: 'ADD_MESSAGE', message: tempMessage });

        // Send via socket
        if (socket) {
          socket.emit('message:sent', tempMessage);
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        dispatch({ type: 'SET_ERROR', error: 'Failed to send message' });
        toast.error('Failed to send message');
      } finally {
        dispatch({ type: 'SET_LOADING', isLoading: false });
      }
    },
    [socket, isConnected]
  );

  // Load previous messages
  const loadMessages = useCallback(async () => {
    if (!state.conversationId) return;

    dispatch({ type: 'SET_LOADING', isLoading: true });

    try {
      // This would typically be an API call
      // For now just mock the functionality
      const messages: ExtendedChatMessage[] = [];
      
      dispatch({ type: 'SET_MESSAGES', messages });
    } catch (error) {
      console.error('Failed to load messages:', error);
      dispatch({ type: 'SET_ERROR', error: 'Failed to load messages' });
    } finally {
      dispatch({ type: 'SET_LOADING', isLoading: false });
    }
  }, [state.conversationId]);

  // Create memoized value
  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
      sendMessage,
      loadMessages,
    }),
    [state, sendMessage, loadMessages]
  );

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  );
}

/**
 * Custom hook to use chat store
 */
export function useChatStore() {
  const context = useContext(ChatContext);
  
  if (!context) {
    throw new Error('useChatStore must be used within a ChatProvider');
  }
  
  const { state, dispatch, sendMessage, loadMessages } = context;
  
  return {
    messages: state.messages,
    input: state.input,
    isLoading: state.isLoading,
    error: state.error,
    conversationId: state.conversationId,
    setInput: (input: string) => dispatch({ type: 'SET_INPUT', input }),
    sendMessage,
    loadMessages,
  };
}