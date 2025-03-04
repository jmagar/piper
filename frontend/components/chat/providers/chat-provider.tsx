'use client';

import * as React from 'react';
import { useChatState } from '@/lib/chat/hooks/use-chat-state';
import { useChatMessages } from '@/lib/chat/hooks/use-chat-messages';
import { useSocketHandlers } from '@/lib/chat/hooks/use-socket-handlers';
import { 
  useChatModelStream,
  useChatModelComplete,
  useChatModelError 
} from '@/lib/socket/hooks';
import { useChatStreaming } from '@/lib/chat/hooks/use-chat-streaming';

/**
 * Props for the ChatProvider component
 */
export interface ChatProviderProps {
  children: React.ReactNode;
  initialConversationId?: string;
  initialThreadId?: string;
  enableTrace?: boolean;
  onError?: (error: Error) => void;
}

/**
 * ChatProvider component
 * 
 * Provides chat functionality to all child components
 * Uses modular hooks for state management, message handling, socket events,
 * and streaming functionality.
 */
export function ChatProvider({
  children,
  initialConversationId,
  initialThreadId,
  enableTrace = false,
  onError
}: ChatProviderProps) {
  // Initialize chat state - manages the core state and actions
  const { 
    conversationId, 
    threadId,
    setConversationId, 
    setThreadId 
  } = useChatState({ 
    enableTrace 
  });
  
  // Set up message handling capabilities
  const { sendMessage } = useChatMessages({ 
    enableTrace, 
    onError 
  });
  
  // Initialize streaming capabilities
  const { 
    processStreamingToken,
    processStreamingComplete,
    processStreamingError 
  } = useChatStreaming({ 
    enableTrace, 
    onError 
  });
  
  // Set up socket event handlers
  useSocketHandlers({ 
    enableTrace, 
    onError 
  });
  
  // Set up LangGraph model streaming handlers
  useChatModelStream(processStreamingToken, []);
  useChatModelComplete(processStreamingComplete, []);
  useChatModelError(processStreamingError, []);
  
  // Initialize conversation and thread IDs if provided
  React.useEffect(() => {
    if (initialConversationId && !conversationId) {
      setConversationId(initialConversationId);
    }
    
    if (initialThreadId && !threadId) {
      setThreadId(initialThreadId);
    }
  }, [initialConversationId, initialThreadId, conversationId, threadId, setConversationId, setThreadId]);
  
  // The provider doesn't directly render any UI but makes functionality
  // available to all child components
  return (
    <>
      {children}
    </>
  );
} 