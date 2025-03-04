import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ExtendedChatMessage } from '@/types/chat';
import { nanoid } from 'nanoid';

// Define message role and status types as they were imported before
export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'sending' | 'streaming' | 'sent' | 'delivered' | 'error';

/**
 * Interface for the chat store state
 */
export interface ChatState {
  // Messages and conversation state
  messages: ExtendedChatMessage[];
  input: string;
  conversationId: string | null;
  threadId: string | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  isSending: boolean;
  streamingMessageId: string | null;
  unsavedChanges: boolean;
  
  // User preferences
  systemPrompt: string;
  model: string;
  
  // Debug state
  messageTraces: Record<string, any[]>;
  socketEvents: Array<{ event: string; data: any; timestamp: number }>;
  maxTracedEvents: number;
  
  // Actions
  setMessages: (messages: ExtendedChatMessage[]) => void;
  clearMessages: () => void;
  addMessage: (message: ExtendedChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ExtendedChatMessage>) => void;
  deleteMessage: (id: string) => void;
  setInput: (input: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setConversationId: (id: string | null) => void;
  setThreadId: (id: string | null) => void;
  setModel: (model: string) => void;
  setSystemPrompt: (prompt: string) => void;
  setSending: (isSending: boolean) => void;
  setStreamingMessageId: (id: string | null) => void;
  addMessageTrace: (messageId: string, event: string, data: any) => void;
  addSocketEvent: (event: string, data: any) => void;
  clearSocketEvents: () => void;
  createLocalMessage: (content: string, role?: MessageRole) => ExtendedChatMessage;
}

/**
 * Create and export the chat store
 */
export const useChatStore = create<ChatState>()(
  persist(
    (set, _) => ({
      // Initial state
      messages: [],
      input: '',
      conversationId: null,
      threadId: null,
      isLoading: false,
      error: null,
      isSending: false,
      streamingMessageId: null,
      unsavedChanges: false,
      systemPrompt: '',
      model: 'gpt-4',
      messageTraces: {},
      socketEvents: [],
      maxTracedEvents: 50,
      
      // Message actions
      setMessages: (messages) => set({ messages, unsavedChanges: false }),
      
      clearMessages: () => set({ 
        messages: [],
        conversationId: null,
        threadId: null,
        streamingMessageId: null,
        unsavedChanges: false
      }),
      
      addMessage: (message) => set((state) => {
        // Check if message already exists to prevent duplicates
        const exists = state.messages.some(m => m.id === message.id);
        if (!exists) {
          return { 
            messages: [...state.messages, message],
            unsavedChanges: true
          };
        }
        return state;
      }),
      
      updateMessage: (id, updates = {}) => set((state) => {
        const index = state.messages.findIndex(m => m.id === id);
        if (index !== -1) {
          const updatedMessages = [...state.messages];
          updatedMessages[index] = { 
            ...updatedMessages[index], 
            ...updates 
          };
          
          // If message is no longer streaming, clear streamingMessageId
          const isStreamingUpdate = updates.status && updates.status !== 'streaming';
          const isStreamingMessage = state.streamingMessageId === id;
          
          return {
            messages: updatedMessages,
            unsavedChanges: true,
            ...(isStreamingUpdate && isStreamingMessage ? { streamingMessageId: null } : {})
          };
        }
        return state;
      }),
      
      deleteMessage: (id) => set((state) => ({
        messages: state.messages.filter(m => m.id !== id),
        unsavedChanges: true
      })),
      
      setInput: (input) => set({ input }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      setConversationId: (conversationId) => set({ conversationId }),
      
      setThreadId: (threadId) => set({ threadId }),
      
      setModel: (model) => set({ model }),
      
      setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
      
      setSending: (isSending) => set({ isSending }),
      
      setStreamingMessageId: (streamingMessageId) => set({ streamingMessageId }),
      
      addMessageTrace: (messageId, event, data) => set((state) => {
        const traces = state.messageTraces[messageId] || [];
        return {
          messageTraces: {
            ...state.messageTraces,
            [messageId]: [
              ...traces,
              {
                event,
                data,
                timestamp: Date.now()
              }
            ]
          }
        };
      }),
      
      addSocketEvent: (event, data) => set((state) => {
        const newEvents = [
          {
            event,
            data,
            timestamp: Date.now()
          },
          ...state.socketEvents
        ].slice(0, state.maxTracedEvents);
        
        return { socketEvents: newEvents };
      }),
      
      clearSocketEvents: () => set({ socketEvents: [] }),
      
      createLocalMessage: (content, role = 'user') => {
        const now = new Date().toISOString();
        const message: ExtendedChatMessage = {
          id: nanoid(),
          role,
          content,
          status: role === 'user' ? 'sent' : 'sending',
          createdAt: now,
          type: 'text', // Default type
          metadata: {
            timestamp: now
          }
        };
        
        return message;
      }
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        conversationId: state.conversationId,
        threadId: state.threadId,
        systemPrompt: state.systemPrompt,
        model: state.model
      })
    }
  )
);

/**
 * Custom hook to create a new assistant message with streaming state
 * @returns A function to create a new streaming assistant message
 */
export function useCreateStreamingMessage() {
  const { addMessage, setStreamingMessageId } = useChatStore();
  
  return (initialContent: string = '') => {
    const now = new Date().toISOString();
    const messageId = nanoid();
    const message: ExtendedChatMessage = {
      id: messageId,
      role: 'assistant',
      content: initialContent,
      status: 'streaming',
      createdAt: now,
      type: 'text',
      conversationId: useChatStore.getState().conversationId || undefined,
      threadId: useChatStore.getState().threadId || undefined,
      metadata: {
        timestamp: now,
        streaming: true
      }
    };
    
    addMessage(message);
    setStreamingMessageId(messageId);
    
    return { messageId, message };
  };
}

/**
 * Custom hook to update a streaming message with new content
 * @returns A function to add streaming chunks to a message
 */
export function useUpdateStreamingMessage() {
  const { updateMessage } = useChatStore();
  
  return (messageId: string, chunk: string) => {
    const message = useChatStore.getState().messages.find(m => m.id === messageId);
    if (!message) return;
    
    updateMessage(messageId, {
      content: message.content + chunk
    });
  };
}

/**
 * Custom hook to complete a streaming message
 * @returns A function to mark a streaming message as complete
 */
export function useCompleteStreamingMessage() {
  const { updateMessage, setStreamingMessageId } = useChatStore();
  
  return (messageId: string, finalContent?: string) => {
    const message = useChatStore.getState().messages.find(m => m.id === messageId);
    if (!message) return;
    
    updateMessage(messageId, {
      status: 'sent',
      content: finalContent !== undefined ? finalContent : message.content,
      metadata: {
        ...message.metadata,
        streaming: false,
        streamComplete: true,
        streamEndTime: new Date().toISOString()
      }
    });
    
    setStreamingMessageId(null);
  };
}

/**
 * Custom hook to mark a streaming message as errored
 * @returns A function to mark a streaming message as errored
 */
export function useErrorStreamingMessage() {
  const { updateMessage, setStreamingMessageId } = useChatStore();
  
  return (messageId: string, errorMessage?: string) => {
    const message = useChatStore.getState().messages.find(m => m.id === messageId);
    if (!message) return;
    
    updateMessage(messageId, {
      status: 'error',
      metadata: {
        ...message.metadata,
        error: errorMessage || 'An error occurred',
        errorTimestamp: new Date().toISOString(),
        streaming: false
      }
    });
    
    setStreamingMessageId(null);
  };
}

// Update the function to have a default empty object for updates
export const updateStreamingMessage = (messageId: string, updates: Partial<ExtendedChatMessage> = {}) => {
  // Implementation
}

export const setStreamingState = (state: boolean, updates: any = {}) => {
  // Implementation
}

// Fix the reference to MessageRole
const createMessage = (message: Partial<ExtendedChatMessage>): ExtendedChatMessage => {
  // Remove any properties that don't exist in ExtendedChatMessage
  const { threadId, ...validProps } = message as any;
  
  return {
    id: nanoid(),
    role: 'user', // Use string literal instead of MessageRole.USER
    content: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    type: "text",
    status: "sending",
    ...validProps,
    metadata: {} // Ensure metadata is initialized
  };
}