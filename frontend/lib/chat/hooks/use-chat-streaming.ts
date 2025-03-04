'use client';

import { useCallback } from 'react';
import { useChatState } from './use-chat-state';
import { useUpdateStreamingMessage, useCompleteStreamingMessage, useErrorStreamingMessage, useCreateStreamingMessage } from '@/store/chat-store';
import { messageDeduplicator } from '@/lib/chat/message-deduplicator';
import { ExtendedChatMessage } from '@/types/chat';

/**
 * Hook for handling streaming message operations
 * Manages chunk updates, completion, and error handling for streaming messages
 */
export function useChatStreaming(options: { 
  enableTrace?: boolean;
  onError?: (error: Error) => void;
} = {}) {
  const { enableTrace = false, onError } = options;
  
  const {
    messages,
    conversationId,
    threadId,
    setConversationId,
    setThreadId,
    setError,
    updateMessage,
    trace
  } = useChatState({ enableTrace });
  
  const updateStreamingMessage = useUpdateStreamingMessage();
  const completeStreamingMessage = useCompleteStreamingMessage();
  const errorStreamingMessage = useErrorStreamingMessage();
  const createStreamingMessage = useCreateStreamingMessage();
  
  /**
   * Handle start of streaming
   */
  const handleStreamStart = useCallback((data: any) => {
    trace(data.response_id, 'stream:start', { 
      conversation_id: data.conversation_id 
    });
    
    if (!conversationId && data.conversation_id) {
      setConversationId(data.conversation_id);
    }
    
    if (!threadId && data.thread_id) {
      setThreadId(data.thread_id);
    }
  }, [conversationId, threadId, setConversationId, setThreadId, trace]);
  
  /**
   * Handle streaming chunk
   */
  const handleStreamChunk = useCallback((data: any) => {
    if (!data.response_id || !data.chunk) return;
    
    // Generate a unique identifier for this chunk
    const chunkId = data.chunk_id || data.index || Date.now();
    
    // Skip duplicate chunks
    if (messageDeduplicator.checkAndTrackChunk(data.response_id, chunkId)) {
      trace(data.response_id, 'stream:chunk:duplicate', { chunk_id: chunkId });
      return;
    }
    
    trace(data.response_id, 'stream:chunk', { 
      chunk: data.chunk.substring(0, 20) + (data.chunk.length > 20 ? '...' : '') 
    });
    
    updateStreamingMessage(data.response_id, data.chunk);
  }, [trace, updateStreamingMessage]);
  
  /**
   * Handle completion of streaming
   */
  const handleStreamComplete = useCallback((data: any) => {
    if (!data.response_id) return;
    
    trace(data.response_id, 'stream:complete', { 
      content_length: data.content?.length,
      metadata: data.metadata 
    });
    
    completeStreamingMessage(data.response_id, data.content);
    
    // Update with any additional metadata
    if (data.metadata) {
      const message = messages.find(m => m.id === data.response_id);
      if (message) {
        const updatedMessage: ExtendedChatMessage = {
          ...message,
          metadata: {
            ...message.metadata,
            ...data.metadata
          }
        };
        updateMessage(message.id, updatedMessage);
      }
    }
  }, [trace, completeStreamingMessage, messages, updateMessage]);
  
  /**
   * Handle streaming error
   */
  const handleStreamError = useCallback((data: any) => {
    if (!data.response_id) return;
    
    trace(data.response_id, 'stream:error', { error: data.error });
    
    errorStreamingMessage(data.response_id, data.error);
    setError(data.error);
    onError?.(new Error(data.error));
  }, [trace, errorStreamingMessage, setError, onError]);
  
  /**
   * Process a LangGraph streaming token
   */
  const processStreamingToken = useCallback((token: string, messageId: string, metadata: Record<string, any>) => {
    trace(messageId, 'langgraph:stream', { 
      token_length: token.length, 
      metadata
    });
    
    // Ensure we have a message to update
    const message = messages.find(m => m.id === messageId);
    if (message) {
      updateStreamingMessage(messageId, token);
    } else {
      // Create a new streaming message if it doesn't exist
      const { messageId: newMessageId } = createStreamingMessage(token);
      trace(newMessageId, 'langgraph:stream:new-message', { 
        original_id: messageId,
        content: token
      });
    }
  }, [messages, updateStreamingMessage, createStreamingMessage, trace]);
  
  /**
   * Process a LangGraph completion event
   */
  const processStreamingComplete = useCallback((messageId: string, metadata: Record<string, any>) => {
    trace(messageId, 'langgraph:complete', { metadata });
    
    // Find the message to complete
    const message = messages.find(m => m.id === messageId);
    if (message) {
      completeStreamingMessage(messageId);
      
      // Update metadata if provided
      if (metadata && Object.keys(metadata).length > 0) {
        const updatedMessage: ExtendedChatMessage = {
          ...message,
          metadata: {
            ...message.metadata,
            ...metadata,
            langgraph_complete: true
          }
        };
        updateMessage(message.id, updatedMessage);
      }
    }
  }, [messages, completeStreamingMessage, updateMessage, trace]);
  
  /**
   * Process a LangGraph error event
   */
  const processStreamingError = useCallback((error: any, messageId: string, metadata: Record<string, any>) => {
    trace(messageId, 'langgraph:error', { error, metadata });
    
    // Find the message to mark as errored
    const message = messages.find(m => m.id === messageId);
    if (message) {
      errorStreamingMessage(messageId, typeof error === 'string' ? error : 'An error occurred during streaming');
    }
    
    // Also set global error state
    if (error) {
      const errorMessage = typeof error === 'string' 
        ? error 
        : error.message || 'An error occurred during streaming';
      
      setError(errorMessage);
      onError?.(new Error(errorMessage));
    }
  }, [messages, errorStreamingMessage, setError, onError, trace]);
  
  return {
    handleStreamStart,
    handleStreamChunk,
    handleStreamComplete,
    handleStreamError,
    processStreamingToken,
    processStreamingComplete,
    processStreamingError
  };
} 