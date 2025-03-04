'use client';

import { useCallback } from 'react';
import { useChatStore } from '@/store/chat-store';
import { ExtendedChatMessage } from '@/types/chat';
import { traceMessage } from '@/components/chat/chat-debug';

const DEBUG_CHAT = true;
const debug = (...args: any[]) => DEBUG_CHAT && console.log('[CHAT STATE]', ...args);

/**
 * Hook for managing core chat state
 * Provides actions for loading, managing, and tracing messages
 */
export function useChatState(options: { enableTrace?: boolean } = {}) {
  const { enableTrace = false } = options;
  
  // Get state and actions from the store
  const {
    messages,
    conversationId,
    threadId,
    isLoading,
    error,
    isSending,
    
    setMessages,
    setConversationId,
    setThreadId,
    setLoading,
    setError,
    setSending,
    addMessage,
    updateMessage,
    deleteMessage,
    
    addMessageTrace,
    addSocketEvent,
  } = useChatStore();
  
  // Trace message journey if enabled
  const trace = useCallback((messageId: string, event: string, data: any = {}) => {
    if (enableTrace) {
      debug(`TRACE [${messageId}] ${event}`, data);
      traceMessage(messageId, event, data);
      addMessageTrace(messageId, event, data);
    }
  }, [enableTrace, addMessageTrace]);
  
  /**
   * Load messages from the server for a conversation
   */
  const loadMessages = useCallback(async (convId: string, onError?: (error: Error) => void) => {
    if (!convId) return { messages: [], threadId: null };
    
    setLoading(true);
    setError(null);
    
    try {
      trace('load-messages', 'fetch:start', { conversationId: convId });
      
      const response = await fetch(`/api/chat/conversations/${convId}/messages`);
      
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.statusText}`);
      }
      
      const data = await response.json();
      trace('load-messages', 'fetch:success', { count: data.messages.length });
      
      // Convert API messages to extended chat messages
      const extendedMessages: ExtendedChatMessage[] = data.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        status: 'sent',
        createdAt: msg.created_at,
        type: msg.type || 'text',
        conversationId: convId,
        threadId: msg.thread_id,
        metadata: msg.metadata || {}
      }));
      
      setMessages(extendedMessages);
      
      if (data.thread_id && !threadId) {
        setThreadId(data.thread_id);
      }
      
      return {
        messages: extendedMessages,
        threadId: data.thread_id
      };
    } catch (error) {
      console.error('Error loading messages:', error);
      trace('load-messages', 'fetch:error', { error: (error as Error).message });
      setError((error as Error).message);
      onError?.(error as Error);
      
      return { messages: [], threadId: null };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setMessages, setThreadId, threadId, trace]);

  return {
    // State
    messages,
    conversationId,
    threadId,
    isLoading,
    error,
    isSending,
    
    // Actions
    setMessages,
    setConversationId,
    setThreadId,
    setLoading,
    setError,
    setSending,
    addMessage,
    updateMessage,
    deleteMessage,
    
    // Helper functions
    trace,
    loadMessages,
    addSocketEvent,
  };
} 