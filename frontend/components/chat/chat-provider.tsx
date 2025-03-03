'use client';

import * as React from 'react';
import { createContext, useContext, useReducer, useMemo, useCallback, useEffect } from 'react';
import { ExtendedChatMessage } from '@/types/chat';
import { 
  useChatModelStream, 
  useChatModelComplete, 
  useChatModelError,
  useSocket 
} from '@/lib/socket-provider';
import { toast } from 'sonner';
import { create } from 'zustand';

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

// Action types for reducer
type ChatAction =
  | { type: 'SET_MESSAGES'; messages: ExtendedChatMessage[] }
  | { type: 'ADD_MESSAGE'; message: ExtendedChatMessage }
  | { type: 'UPDATE_MESSAGE'; message: ExtendedChatMessage }
  | { type: 'SET_INPUT'; input: string }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_CONVERSATION_ID'; conversationId: string };

// Reducer function
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_MESSAGES':
      return { ...state, messages: action.messages };
      
    case 'ADD_MESSAGE':
      return { 
        ...state, 
        messages: [...state.messages, action.message] 
      };
      
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === action.message.id
            ? { ...message, ...action.message }
            : message
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

// Chat context for provider
const ChatContext = createContext<
  | {
      state: ChatState;
      dispatch: React.Dispatch<ChatAction>;
      sendMessage: (content: string) => Promise<void>;
    }
  | undefined
>(undefined);

// Chat provider props
interface ChatProviderProps {
  children: React.ReactNode;
  initialMessages?: ExtendedChatMessage[];
  conversationId?: string;
}

// Create a Zustand store for easier access outside React components
interface ChatStoreState {
  messages: ExtendedChatMessage[];
  input: string;
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  setMessages: (messages: ExtendedChatMessage[]) => void;
  setInput: (input: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  sendMessage: (content: string) => Promise<void>;
  loadMessages: () => Promise<void>;
}

// Create the store with socket integration
export const useChatStore = create<ChatStoreState>((set, get) => {
  // Get the socket - note this might be null during SSR
  let socketInstance: any = null;
  
  if (typeof window !== 'undefined') {
    // Import dynamically to avoid SSR issues
    import('@/lib/socket-provider').then(module => {
      try {
        // Get the socket context from the hook
        const { socket } = module.useSocket();
        socketInstance = socket;
      } catch (err) {
        console.error('Error getting socket in store:', err);
      }
    });
  }
  
  return {
    messages: [],
    input: '',
    isLoading: false,
    error: null,
    conversationId: null,
    setMessages: (messages) => set({ messages }),
    setInput: (input) => set({ input }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    
    // Send message via socket
    sendMessage: async (content) => {
      try {
        if (!content.trim()) return;
        
        set({ isLoading: true });
        
        // Create a temporary message for immediate display
        const tempMessage: ExtendedChatMessage = {
          id: `user-${Date.now()}`,
          content,
          role: 'user',
          type: 'text',
          status: 'sending',
          createdAt: new Date().toISOString(),
          metadata: {
            timestamp: Date.now()
          }
        };
        
        // Add to local state
        const { messages, conversationId } = get();
        set({ messages: [...messages, tempMessage], input: '' });
        
        // Try to get the socket from window if not available
        if (!socketInstance && typeof window !== 'undefined') {
          try {
            // @ts-ignore - accessing window object with custom property
            socketInstance = window.__socketInstance;
          } catch (e) {
            console.error('Could not access socket from window', e);
          }
        }
        
        if (!socketInstance) {
          console.warn('Socket not available, cannot send message');
          toast.error('Connection issue. Please reload the page.');
          return;
        }
        
        // Send via socket.io
        socketInstance.emit('message:send', {
          content,
          conversationId: conversationId || 'default',
          metadata: {
            timestamp: Date.now()
          }
        }, (response: any) => {
          if (response.error) {
            console.error('Message send error:', response.error);
            toast.error('Failed to send message');
            set({ error: response.error });
          }
        });
        
      } catch (error) {
        console.error('Error sending message:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to send message' 
        });
        toast.error('Failed to send message');
      } finally {
        set({ isLoading: false });
      }
    },
    
    loadMessages: async () => {
      // No-op implementation for backward compatibility
      return Promise.resolve();
    }
  };
});

// Chat provider component
export function ChatProvider({
  children,
  initialMessages = [],
  conversationId,
}: ChatProviderProps) {
  // Set up reducer
  const [state, dispatch] = useReducer(chatReducer, {
    ...initialState,
    messages: initialMessages,
    conversationId: conversationId || null,
  });
  
  // Access socket context
  const { socket, isConnected, eventEmitter } = useSocket();
  
  // Store socket in window for access from Zustand
  React.useEffect(() => {
    if (socket && typeof window !== 'undefined') {
      // @ts-ignore - extending window
      window.__socketInstance = socket;
    }
  }, [socket]);
  
  // Message state tracking - using LangGraph style approach
  const messageContentMap = useMemo(() => new Map<string, string>(), []);
  
  // Helper to convert simple message to extended format
  const convertToExtendedMessage = (message: any): ExtendedChatMessage => {
    return {
      ...message,
      type: message.type || 'text',
      metadata: message.metadata || {},
    };
  };
  
  // Set up event listeners for socket events using LangGraph-style hooks
  
  // Handle new messages from server
  const onNewMessage = useCallback((message: any) => {
    console.log('Received new message:', message);
    
    // Create initial entry in content map for streaming messages
    if (message.status === 'streaming') {
      messageContentMap.set(message.id, '');
      console.log(`Initialized content map for message: ${message.id}`);
    }
    
    dispatch({ type: 'ADD_MESSAGE', message: convertToExtendedMessage(message) });
    
    // Also update Zustand store for consistency
    const store = useChatStore.getState();
    store.setMessages([...store.messages, convertToExtendedMessage(message)]);
  }, [messageContentMap]);
  
  // Handle message updates
  const onMessageUpdate = useCallback((message: any) => {
    console.log('Message updated:', message);
    dispatch({ type: 'UPDATE_MESSAGE', message: convertToExtendedMessage(message) });
    
    // Also update Zustand store for consistency
    const store = useChatStore.getState();
    const updatedMessages = store.messages.map(m => 
      m.id === message.id ? { ...m, ...convertToExtendedMessage(message) } : m
    );
    store.setMessages(updatedMessages);
  }, []);
  
  // Set up listeners for socket events
  useEffect(() => {
    if (!socket) return;
    
    console.log('Setting up chat message listeners');
    
    // Set up event handlers for standard socket events
    socket.on('message:new', onNewMessage);
    socket.on('message:update', onMessageUpdate);
    
    // Clean up event listeners
    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('message:update', onMessageUpdate);
    };
  }, [socket, onNewMessage, onMessageUpdate]);
  
  // Handle LangGraph stream tokens - replaces old chunk handling
  useChatModelStream((token, messageId, metadata) => {
    console.log(`[LangGraph] Received token for ${messageId}, length: ${token.length}`);
    
    // Initialize content map if needed
    if (!messageContentMap.has(messageId)) {
      messageContentMap.set(messageId, '');
      console.log(`[LangGraph] Initialized content map for message: ${messageId}`);
    }
    
    // Accumulate content
    const currentContent = messageContentMap.get(messageId) || '';
    const updatedContent = currentContent + token;
    messageContentMap.set(messageId, updatedContent);
    
    // Find existing message
    const existingMessage = state.messages.find(msg => msg.id === messageId);
    
    if (existingMessage) {
      // Update the message
      dispatch({
        type: 'UPDATE_MESSAGE',
        message: {
          ...existingMessage,
          content: updatedContent,
          status: 'streaming' as const,
          metadata: {
            ...existingMessage.metadata,
            streaming: true,
            streamComplete: false,
            lastChunkAt: new Date().toISOString(),
            totalLength: updatedContent.length,
            lastChunk: token
          }
        }
      });
      
      // Also update Zustand store
      const store = useChatStore.getState();
      const updatedMessages = store.messages.map(m => 
        m.id === messageId ? {
          ...m,
          content: updatedContent,
          status: 'streaming',
          metadata: {
            ...m.metadata,
            streaming: true,
            streamComplete: false,
            lastChunkAt: new Date().toISOString(),
            totalLength: updatedContent.length,
            lastChunk: token
          }
        } : m
      );
      store.setMessages(updatedMessages);
    } else {
      // Find any assistant message that might be streaming
      const streamingMessage = state.messages.find(m => 
        m.role === 'assistant' && m.status === 'streaming'
      );
      
      if (streamingMessage) {
        // Found a streaming message, update its content
        dispatch({
          type: 'UPDATE_MESSAGE',
          message: {
            ...streamingMessage,
            content: updatedContent,
            metadata: {
              ...streamingMessage.metadata,
              streaming: true,
              lastChunkAt: new Date().toISOString(),
              totalLength: updatedContent.length,
              lastChunk: token
            }
          }
        });
        
        // Also update Zustand store
        const store = useChatStore.getState();
        const updatedMessages = store.messages.map(m => 
          m.id === streamingMessage.id ? {
            ...m,
            content: updatedContent,
            metadata: {
              ...m.metadata,
              streaming: true,
              lastChunkAt: new Date().toISOString(),
              totalLength: updatedContent.length,
              lastChunk: token
            }
          } : m
        );
        store.setMessages(updatedMessages);
      } else {
        console.warn(`[LangGraph] Received token for unknown message: ${messageId}`);
      }
    }
  });
  
  // Handle LangGraph completion events - replaces old completion handling
  useChatModelComplete((messageId, metadata) => {
    console.log(`[LangGraph] Message complete: ${messageId}`);
    
    // Get accumulated content
    const content = messageContentMap.get(messageId) || '';
    
    // Try to find the message
    const existingMessage = state.messages.find(m => m.id === messageId);
    
    if (existingMessage) {
      // Update the message to mark it as complete
      dispatch({
        type: 'UPDATE_MESSAGE',
        message: {
          ...existingMessage,
          content: content || existingMessage.content,
          status: 'sent' as const,
          metadata: {
            ...existingMessage.metadata,
            streaming: false,
            streamComplete: true,
            streamEndTime: metadata.timestamp || new Date().toISOString()
          }
        }
      });
      
      // Clean up tracking
      messageContentMap.delete(messageId);
      
      // Also update Zustand store
      const store = useChatStore.getState();
      const updatedMessages = store.messages.map(m => 
        m.id === messageId ? {
          ...m,
          content: content || m.content,
          status: 'sent',
          metadata: {
            ...m.metadata,
            streaming: false,
            streamComplete: true,
            streamEndTime: metadata.timestamp || new Date().toISOString()
          }
        } : m
      );
      store.setMessages(updatedMessages);
    } else {
      // Try to find any streaming assistant message
      const streamingMessage = state.messages.find(m => 
        m.role === 'assistant' && m.status === 'streaming'
      );
      
      if (streamingMessage) {
        // Update the streaming message with the completion status
        dispatch({
          type: 'UPDATE_MESSAGE',
          message: {
            ...streamingMessage,
            content: content || streamingMessage.content,
            status: 'sent' as const,
            metadata: {
              ...streamingMessage.metadata,
              streaming: false,
              streamComplete: true,
              streamEndTime: metadata.timestamp || new Date().toISOString()
            }
          }
        });
        
        // Clean up tracking
        messageContentMap.delete(messageId);
        
        // Also update Zustand store
        const store = useChatStore.getState();
        const updatedMessages = store.messages.map(m => 
          m.id === streamingMessage.id ? {
            ...m,
            content: content || m.content,
            status: 'sent',
            metadata: {
              ...m.metadata,
              streaming: false,
              streamComplete: true,
              streamEndTime: metadata.timestamp || new Date().toISOString()
            }
          } : m
        );
        store.setMessages(updatedMessages);
      } else {
        console.warn(`[LangGraph] Completion for unknown message: ${messageId}`);
      }
    }
  });
  
  // Handle LangGraph error events - replaces old error handling
  useChatModelError((error, messageId, metadata) => {
    console.error(`[LangGraph] Error for message ${messageId}:`, error);
    
    // Find the message that errored
    const existingMessage = state.messages.find(m => m.id === messageId);
    
    if (existingMessage) {
      // Update the message with error status
      dispatch({
        type: 'UPDATE_MESSAGE',
        message: {
          ...existingMessage,
          status: 'error' as const,
          metadata: {
            ...existingMessage.metadata,
            streaming: false,
            streamComplete: false,
            error: error.message || 'An error occurred',
            errorTimestamp: new Date().toISOString()
          }
        }
      });
      
      // Also update Zustand store
      const store = useChatStore.getState();
      const updatedMessages = store.messages.map(m => 
        m.id === messageId ? {
          ...m,
          status: 'error',
          metadata: {
            ...m.metadata,
            streaming: false,
            streamComplete: false,
            error: error.message || 'An error occurred',
            errorTimestamp: new Date().toISOString()
          }
        } : m
      );
      store.setMessages(updatedMessages);
    } else {
      // Try to find any streaming assistant message
      const streamingMessage = state.messages.find(m => 
        m.role === 'assistant' && m.status === 'streaming'
      );
      
      if (streamingMessage) {
        // Update the streaming message with error status
        dispatch({
          type: 'UPDATE_MESSAGE',
          message: {
            ...streamingMessage,
            status: 'error' as const,
            metadata: {
              ...streamingMessage.metadata,
              streaming: false,
              streamComplete: false,
              error: error.message || 'An error occurred',
              errorTimestamp: new Date().toISOString()
            }
          }
        });
        
        // Also update Zustand store
        const store = useChatStore.getState();
        const updatedMessages = store.messages.map(m => 
          m.id === streamingMessage.id ? {
            ...m,
            status: 'error',
            metadata: {
              ...m.metadata,
              streaming: false,
              streamComplete: false,
              error: error.message || 'An error occurred',
              errorTimestamp: new Date().toISOString()
            }
          } : m
        );
        store.setMessages(updatedMessages);
      } else {
        // No streaming message found, add a new error message
        const errorMessage: ExtendedChatMessage = {
          id: `error-${Date.now()}`,
          content: `Error: ${error.message || 'An unknown error occurred'}`,
          role: 'system',
          type: 'system',
          status: 'error',
          createdAt: new Date().toISOString(),
          metadata: {
            error: error.message || 'An unknown error occurred',
            relatedMessageId: messageId
          }
        };
        
        dispatch({ type: 'ADD_MESSAGE', message: errorMessage });
        
        // Also update Zustand store
        const store = useChatStore.getState();
        store.setMessages([...store.messages, errorMessage]);
      }
    }
    
    // Set error state
    dispatch({ 
      type: 'SET_ERROR', 
      error: error.message || 'An error occurred processing your message' 
    });
    
    // Also update Zustand store
    const store = useChatStore.getState();
    store.setError(error.message || 'An error occurred processing your message');
    
    // Show toast
    toast.error(error.message || 'An error occurred processing your message');
  });
  
  // Send message function
  const sendMessage = async (content: string) => {
    if (!socket || !isConnected) {
      toast.error('Not connected to server');
      return;
    }
    
    if (!content.trim()) return;
    
    console.log('Sending message with content:', content);
    
    // Create user message
    const userMessage: ExtendedChatMessage = {
      id: `user-${Date.now()}`,
      content,
      role: 'user',
      type: 'text',
      status: 'sending',
      createdAt: new Date().toISOString(),
      metadata: {
        timestamp: Date.now()
      }
    };
    
    // Add to messages
    dispatch({ type: 'ADD_MESSAGE', message: userMessage });
    
    // Set loading state
    dispatch({ type: 'SET_LOADING', isLoading: true });
    dispatch({ type: 'SET_INPUT', input: '' });
    
    try {
      // Send to server
      console.log('Socket connected, emitting message:send event');
      socket.emit('message:send', {
          content,
          conversationId: state.conversationId || 'default',
          metadata: {
            timestamp: Date.now()
          }
        }, (response: any) => {
          console.log('Message:send response:', response);
          if (response.error) {
            console.error('Message send error:', response.error);
            toast.error('Failed to send message');
            
            // Update user message to reflect error
            dispatch({
              type: 'UPDATE_MESSAGE',
              message: {
                ...userMessage,
                status: 'error',
                metadata: {
                  ...userMessage.metadata,
                  error: response.error
                }
              }
            });
          } else if (response.message) {
            // Update user message status to sent
            dispatch({
              type: 'UPDATE_MESSAGE',
              message: {
                ...userMessage,
                status: 'delivered'
              }
            });
            
            // If a conversation ID was not set, set it from the response
            if (!state.conversationId && response.message.conversationId) {
              dispatch({
                type: 'SET_CONVERSATION_ID',
                conversationId: response.message.conversationId
              });
              
              // Update Zustand store too
              const store = useChatStore.getState();
              store.conversationId = response.message.conversationId;
            }
          }
        });
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
      
      // Update user message to reflect error
      dispatch({
        type: 'UPDATE_MESSAGE',
        message: {
          ...userMessage,
          status: 'error',
          metadata: {
            ...userMessage.metadata,
            error: err instanceof Error ? err.message : 'Unknown error'
          }
        }
      });
    } finally {
      // Set loading state to false
      dispatch({ type: 'SET_LOADING', isLoading: false });
    }
  };
  
  // Provide state and methods to children
  const value = {
    state,
    dispatch,
    sendMessage,
  };
  
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}