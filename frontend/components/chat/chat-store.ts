import { create } from 'zustand';
import { ExtendedChatMessage } from '@/types/chat';

// Default system message for chat
const DEFAULT_SYSTEM_MESSAGE = "You are a helpful assistant.";

/**
 * Store state for chat functionality
 */
interface ChatState {
  messages: ExtendedChatMessage[];
  isLoading: boolean;
  error: string | null;
  system?: string;
}

/**
 * Chat store actions for managing messages and state
 */
interface ChatActions {
  addMessage: (message: ExtendedChatMessage) => void;
  setMessages: (messages: ExtendedChatMessage[]) => void;
  clearMessages: () => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setSystem: (system: string) => void;
  loadMessages: (conversationId: string) => Promise<void>;
  updateMessage: (id: string, updates: Partial<ExtendedChatMessage>) => void;
  removeMessage: (id: string) => void;
}

/**
 * Create chat store with Zustand
 * Provides state management for chat messages, loading state, and errors
 */
export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  system: DEFAULT_SYSTEM_MESSAGE,

  // Add a new message to the list
  addMessage: (message) => {
    // Don't add duplicates
    if (get().messages.some(m => m.id === message.id)) {
      return;
    }
    set(state => ({
      messages: [...state.messages, message],
      // Clear error when a new message is received
      error: null
    }));
  },

  // Set all messages
  setMessages: (messages) => {
    set({ 
      messages,
      // Clear error when messages are loaded
      error: null 
    });
  },

  // Remove a specific message by ID
  removeMessage: (id) => {
    set(state => ({
      messages: state.messages.filter(message => message.id !== id)
    }));
  },

  // Clear all messages
  clearMessages: () => {
    set({ messages: [] });
  },

  // Set loading state
  setIsLoading: (isLoading) => {
    set({ isLoading });
  },

  // Set error message
  setError: (error) => {
    set({ error });
    
    // Log errors to console in development
    if (error && process.env.NODE_ENV !== 'production') {
      console.error('Chat error:', error);
    }
    
    // Clear error after 5 seconds in most cases
    // Persistent connection errors will be re-set by the provider
    if (error) {
      setTimeout(() => {
        // Only clear the error if it hasn't changed
        set(state => {
          if (state.error === error) {
            return { error: null };
          }
          return state;
        });
      }, 5000);
    }
  },

  // Set system message
  setSystem: (system) => {
    set({ system });
  },

  // Update properties of a specific message by ID
  updateMessage: (id, updates) => {
    set(state => ({
      messages: state.messages.map(message => 
        message.id === id 
          ? { ...message, ...updates }
          : message
      )
    }));
  },

  // Load messages for a conversation
  loadMessages: async (conversationId) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch(`/api/chat/${conversationId}/messages`);
      
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      set({ 
        messages: data.messages || [],
        isLoading: false
      });
    } catch (error) {
      set({ 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load messages'
      });
      throw error;
    }
  }
})); 