"use client";

import * as React from "react";
import { useSocket } from "@/lib/socket";

/**
 * Conversation interface representing a chat history item
 * Follows the ChatConversation schema from openapi/schemas/chat.yaml
 */
export interface Conversation {
  /** Unique identifier for the conversation */
  id: string;
  /** Auto-generated or user-edited title */
  title: string;
  /** When the conversation was created */
  createdAt: string;
  /** When the conversation was last updated */
  updatedAt: string;
  /** Whether the conversation is starred/favorited */
  isStarred: boolean;
  /** Whether the conversation is archived */
  isArchived: boolean;
  /** User ID of the conversation creator */
  userId: string;
  /** Additional metadata */
  metadata?: {
    /** Number of messages in the conversation */
    messageCount?: number;
    /** Last message content (preview) */
    lastMessage?: string;
    /** Brief summary of the conversation */
    summary?: string;
    /** Additional properties */
    [key: string]: unknown;
  };
  /** Summary of the conversation content */
  summary?: string;
}

/**
 * Context state for chat history
 */
interface ChatHistoryContextState {
  /** List of all conversations */
  conversations: Conversation[];
  /** Filtered conversations based on search/filters */
  filteredConversations: Conversation[];
  /** Current search query */
  searchQuery: string;
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Currently selected conversation ID */
  selectedConversationId: string | null;
  /** Whether a title generation is in progress */
  isTitleGenerating: boolean;
  /** Show archived conversations */
  showArchived: boolean;
}

/**
 * Actions for chat history management
 */
interface ChatHistoryContextActions {
  /** Set the search query to filter conversations */
  setSearchQuery: (query: string) => void;
  /** Select a conversation */
  selectConversation: (id: string) => void;
  /** Generate a title for a conversation */
  generateTitle: (id: string) => Promise<void>;
  /** Edit a conversation title */
  editTitle: (id: string, newTitle: string) => Promise<void>;
  /** Delete a conversation */
  deleteConversation: (id: string) => Promise<void>;
  /** Archive/unarchive a conversation */
  toggleArchive: (id: string) => Promise<void>;
  /** Star/unstar a conversation */
  toggleStar: (id: string) => Promise<void>;
  /** Toggle showing archived conversations */
  toggleShowArchived: () => void;
  /** Refresh the conversation list */
  refreshConversations: () => Promise<void>;
}

/**
 * Combined context type for chat history
 */
type ChatHistoryContextType = ChatHistoryContextState & ChatHistoryContextActions;

/**
 * Create context with undefined default value
 */
const ChatHistoryContext = React.createContext<ChatHistoryContextType | undefined>(undefined);

/**
 * Hook for accessing the chat history context
 * @throws Error if used outside of a ChatHistoryProvider
 */
export function useChatHistory() {
  const context = React.useContext(ChatHistoryContext);
  if (context === undefined) {
    throw new Error("useChatHistory must be used within a ChatHistoryProvider");
  }
  return context;
}

/**
 * Chat History Provider Props
 */
interface ChatHistoryProviderProps {
  /** Initial conversation ID to select */
  initialConversationId?: string;
  /** Children components */
  children: React.ReactNode;
}

/**
 * Provider component for chat history functionality
 * Manages conversation data, searching, filtering, and actions
 */
export function ChatHistoryProvider({
  initialConversationId,
  children
}: ChatHistoryProviderProps) {
  // State for chat history
  const [state, setState] = React.useState<ChatHistoryContextState>({
    conversations: [],
    filteredConversations: [],
    searchQuery: "",
    isLoading: true,
    error: null,
    selectedConversationId: initialConversationId || null,
    isTitleGenerating: false,
    showArchived: false,
  });

  // Socket for real-time updates
  const { socket, isConnected } = useSocket();

  // Debounced search function
  const debouncedSearch = React.useCallback(
    React.useCallback((query: string) => {
      if (!query.trim()) {
        setState(prev => ({
          ...prev,
          filteredConversations: prev.showArchived 
            ? prev.conversations 
            : prev.conversations.filter(c => !c.isArchived)
        }));
        return;
      }

      const lowerQuery = query.toLowerCase();
      setState(prev => ({
        ...prev,
        filteredConversations: prev.conversations.filter(conversation => {
          const matchesTitle = conversation.title.toLowerCase().includes(lowerQuery);
          const matchesPreview = conversation.metadata?.lastMessage?.toLowerCase().includes(lowerQuery);
          const matchesSummary = conversation.summary?.toLowerCase().includes(lowerQuery);
          const matchesArchived = prev.showArchived ? true : !conversation.isArchived;
          return (matchesTitle || matchesPreview || matchesSummary) && matchesArchived;
        })
      }));
    }, []),
    []
  );

  // Apply search query with debounce
  React.useEffect(() => {
    const handler = setTimeout(() => {
      debouncedSearch(state.searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [state.searchQuery, state.conversations, state.showArchived, debouncedSearch]);

  // Fetch conversations on initial load
  React.useEffect(() => {
    async function fetchConversations() {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        // Using the API endpoint defined in your OpenAPI schema
        const userId = "current"; // Should be replaced with actual user ID from auth context
        const response = await fetch(`/api/chat/conversations/${userId}`);
        
        if (!response.ok) {
          // Fallback to mock data for development/demonstration
          console.warn('Failed to fetch conversations from API, using mock data');
          const mockConversations = [
            {
              id: "conv-1",
              title: "React Component Architecture",
              createdAt: new Date(new Date().getTime() - 2 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(new Date().getTime() - 1 * 60 * 60 * 1000).toISOString(),
              isStarred: true,
              isArchived: false,
              userId: "current",
              metadata: {
                messageCount: 12,
                lastMessage: "Let's discuss component patterns",
              }
            },
            {
              id: "conv-2",
              title: "Tailwind CSS Best Practices",
              createdAt: new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              isStarred: false,
              isArchived: false,
              userId: "current",
              metadata: {
                messageCount: 8,
                lastMessage: "How to organize utility classes",
              }
            },
            {
              id: "conv-3",
              title: "Next.js 15 Features",
              createdAt: new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              isStarred: false,
              isArchived: true,
              userId: "current",
              metadata: {
                messageCount: 15,
                lastMessage: "Server components and routing",
              }
            }
          ];
          
          return { conversations: mockConversations };
        }
        
        const data = await response.json();
        
        setState(prev => {
          const updatedState = {
            ...prev,
            conversations: data.conversations || [],
            isLoading: false,
          };
          
          return {
            ...updatedState,
            filteredConversations: updatedState.showArchived 
              ? updatedState.conversations 
              : updatedState.conversations.filter((c: Conversation) => !c.isArchived)
          };
        });
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
          isLoading: false
        }));
      }
    }

    fetchConversations();
    
    // Listen for real-time updates if socket is available
    if (socket && isConnected) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket.on('chat:historyUpdated' as any, refreshConversations);
      
      return () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        socket.off('chat:historyUpdated' as any);
      };
    }
  }, [socket, isConnected]);

  /**
   * Refresh the conversations list
   */
  const refreshConversations = React.useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Using the API endpoint defined in your OpenAPI schema
      const userId = "current"; // Should be replaced with actual user ID from auth context
      const response = await fetch(`/api/chat/conversations/${userId}`);
      
      let data;
      if (!response.ok) {
        // Fallback to mock data for development/demonstration
        console.warn('Failed to fetch conversations from API, using mock data');
        const mockConversations = [
          {
            id: "conv-1",
            title: "React Component Architecture",
            createdAt: new Date(new Date().getTime() - 2 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(new Date().getTime() - 1 * 60 * 60 * 1000).toISOString(),
            isStarred: true,
            isArchived: false,
            userId: "current",
            metadata: {
              messageCount: 12,
              lastMessage: "Let's discuss component patterns",
            }
          },
          {
            id: "conv-2",
            title: "Tailwind CSS Best Practices",
            createdAt: new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            isStarred: false,
            isArchived: false,
            userId: "current",
            metadata: {
              messageCount: 8,
              lastMessage: "How to organize utility classes",
            }
          },
          {
            id: "conv-3",
            title: "Next.js 15 Features",
            createdAt: new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            isStarred: false,
            isArchived: true,
            userId: "current",
            metadata: {
              messageCount: 15,
              lastMessage: "Server components and routing",
            }
          }
        ];
        
        data = { conversations: mockConversations };
      } else {
        data = await response.json();
      }
      
      setState(prev => {
        const updatedState = {
          ...prev,
          conversations: data.conversations || [],
          isLoading: false,
        };
        
        return {
          ...updatedState,
          filteredConversations: updatedState.showArchived 
            ? updatedState.conversations 
            : updatedState.conversations.filter((c: Conversation) => !c.isArchived)
        };
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      }));
    }
  }, []);

  /**
   * Set the search query for filtering conversations
   */
  const setSearchQuery = React.useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  /**
   * Select a conversation by ID
   */
  const selectConversation = React.useCallback((id: string) => {
    setState(prev => ({ ...prev, selectedConversationId: id }));
  }, []);

  /**
   * Generate a title for a conversation with rate limiting
   */
  const generateTitle = React.useCallback(async (id: string) => {
    try {
      setState(prev => ({ ...prev, isTitleGenerating: true, error: null }));
      
      // Rate limiting check would go here
      
      // Simulated API call - replace with actual implementation
      const response = await fetch(`/api/chat/${id}/generate-title`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate title');
      }
      
      const { title } = await response.json();
      
      // Update the conversation with the new title
      setState(prev => {
        const updatedConversations = prev.conversations.map(conv => 
          conv.id === id ? { ...conv, title } : conv
        );
        
        return {
          ...prev,
          isTitleGenerating: false,
          conversations: updatedConversations,
          filteredConversations: prev.showArchived 
            ? updatedConversations 
            : updatedConversations.filter(c => !c.isArchived)
        };
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isTitleGenerating: false
      }));
    }
  }, []);

  /**
   * Edit a conversation title
   */
  const editTitle = React.useCallback(async (id: string, newTitle: string) => {
    try {
      // Validate the title
      if (!newTitle.trim()) {
        throw new Error('Title cannot be empty');
      }
      
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Simulated API call - replace with actual implementation
      const response = await fetch(`/api/chat/${id}/title`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update title');
      }
      
      // Update the conversation with the new title
      setState(prev => {
        const updatedConversations = prev.conversations.map(conv => 
          conv.id === id ? { ...conv, title: newTitle } : conv
        );
        
        return {
          ...prev,
          isLoading: false,
          conversations: updatedConversations,
          filteredConversations: prev.showArchived 
            ? updatedConversations 
            : updatedConversations.filter(c => !c.isArchived)
        };
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      }));
    }
  }, []);

  /**
   * Delete a conversation
   */
  const deleteConversation = React.useCallback(async (id: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Simulated API call - replace with actual implementation
      const response = await fetch(`/api/chat/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }
      
      // Remove the conversation from state
      setState(prev => {
        const updatedConversations = prev.conversations.filter(conv => conv.id !== id);
        
        return {
          ...prev,
          isLoading: false,
          conversations: updatedConversations,
          filteredConversations: prev.showArchived 
            ? updatedConversations 
            : updatedConversations.filter(c => !c.isArchived),
          // If the deleted conversation was selected, clear selection
          selectedConversationId: prev.selectedConversationId === id 
            ? null 
            : prev.selectedConversationId
        };
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      }));
    }
  }, []);

  /**
   * Toggle archive status of a conversation
   */
  const toggleArchive = React.useCallback(async (id: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Find current archive status
      const conversation = state.conversations.find(conv => conv.id === id);
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      const newArchiveStatus = !conversation.isArchived;
      
      // Simulated API call - replace with actual implementation
      const response = await fetch(`/api/chat/${id}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isArchived: newArchiveStatus })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${newArchiveStatus ? 'archive' : 'unarchive'} conversation`);
      }
      
      // Update the conversation
      setState(prev => {
        const updatedConversations = prev.conversations.map(conv => 
          conv.id === id ? { ...conv, isArchived: newArchiveStatus } : conv
        );
        
        return {
          ...prev,
          isLoading: false,
          conversations: updatedConversations,
          filteredConversations: prev.showArchived 
            ? updatedConversations 
            : updatedConversations.filter(c => !c.isArchived)
        };
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      }));
    }
  }, [state.conversations]);

  /**
   * Toggle star/favorite status of a conversation
   */
  const toggleStar = React.useCallback(async (id: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Find current star status
      const conversation = state.conversations.find(conv => conv.id === id);
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      const newStarStatus = !conversation.isStarred;
      
      // Simulated API call - replace with actual implementation
      const response = await fetch(`/api/chat/${id}/star`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isStarred: newStarStatus })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${newStarStatus ? 'star' : 'unstar'} conversation`);
      }
      
      // Update the conversation
      setState(prev => {
        const updatedConversations = prev.conversations.map(conv => 
          conv.id === id ? { ...conv, isStarred: newStarStatus } : conv
        );
        
        return {
          ...prev,
          isLoading: false,
          conversations: updatedConversations,
          filteredConversations: prev.showArchived 
            ? updatedConversations 
            : updatedConversations.filter(c => !c.isArchived)
        };
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      }));
    }
  }, [state.conversations]);

  /**
   * Toggle showing archived conversations
   */
  const toggleShowArchived = React.useCallback(() => {
    setState(prev => {
      const newShowArchived = !prev.showArchived;
      return {
        ...prev,
        showArchived: newShowArchived,
        filteredConversations: newShowArchived 
          ? prev.conversations 
          : prev.conversations.filter(c => !c.isArchived)
      };
    });
  }, []);

  // Context value combining state and actions
  const value = React.useMemo(() => ({
    ...state,
    setSearchQuery,
    selectConversation,
    generateTitle,
    editTitle,
    deleteConversation,
    toggleArchive,
    toggleStar,
    toggleShowArchived,
    refreshConversations
  }), [
    state,
    setSearchQuery,
    selectConversation,
    generateTitle,
    editTitle,
    deleteConversation,
    toggleArchive,
    toggleStar,
    toggleShowArchived,
    refreshConversations
  ]);

  return (
    <ChatHistoryContext.Provider value={value}>
      {children}
    </ChatHistoryContext.Provider>
  );
}