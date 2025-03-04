'use client';

import { useCallback } from 'react';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { useSocket } from '@/lib/socket/hooks';
import { useCreateStreamingMessage, useErrorStreamingMessage } from '@/store/chat-store';
import { useChatState } from './use-chat-state';
import { messageDeduplicator } from '@/lib/chat/message-deduplicator';
import { ExtendedChatMessage } from '@/types/chat';
import { logSocketEvent } from '@/lib/socket/hooks/use-socket-event';
import { MessageSendRequest } from '@/types/socket';
import { MessageResponse } from '@/lib/socket/core/events';

/**
 * Hook for handling chat message operations
 * Provides functions for sending and managing messages
 */
export function useChatMessages(options: { 
  enableTrace?: boolean;
  onError?: (error: Error) => void;
} = {}) {
  const { enableTrace = false, onError } = options;
  
  const { socket } = useSocket();
  const createStreamingMessage = useCreateStreamingMessage();
  const errorStreamingMessage = useErrorStreamingMessage();
  
  const {
    conversationId,
    threadId,
    setSending,
    setError,
    addMessage,
    trace
  } = useChatState({ enableTrace });
  
  /**
   * Send a message to the server
   * Creates user message, initializes assistant response, and sends via socket
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !socket) return;
    
    setSending(true);
    setError(null);
    
    // Create user message
    const userMessageId = nanoid();
    const userMessage: ExtendedChatMessage = {
      id: userMessageId,
      role: 'user',
      content,
      status: 'sent',
      createdAt: new Date().toISOString(),
      type: 'text',
      metadata: {}
    };
    
    // Only add these properties if they exist
    if (conversationId) userMessage.conversationId = conversationId;
    if (threadId) userMessage.threadId = threadId;
    
    trace(userMessageId, 'user:create', { content: content.substring(0, 100) });
    
    // Track user message to prevent duplicates
    messageDeduplicator.trackMessage(userMessageId);
    addMessage(userMessage);
    
    // Create assistant message in streaming state
    const { messageId: assistantMessageId } = createStreamingMessage('');
    trace(assistantMessageId, 'assistant:create', { streaming: true });
    
    // Track assistant message
    messageDeduplicator.trackMessage(assistantMessageId);
    
    try {
      // Prepare message payload
      const messagePayload: MessageSendRequest = {
        content,
        metadata: {
          message_id: userMessageId,
          response_id: assistantMessageId,
          thread_id: threadId
        }
      };
      
      // Only add conversationId if it exists
      if (conversationId) {
        messagePayload.conversationId = conversationId;
      }
      
      // Emit message to socket with correct payload structure
      socket.emit('message:send', messagePayload, (response: MessageResponse) => {
        // Handle acknowledgement from server
        if (response?.error) {
          console.error('Message send error:', response.error);
          trace(assistantMessageId, 'socket:ack:error', { error: response.error });
          errorStreamingMessage(assistantMessageId, response.error);
        } else {
          trace(assistantMessageId, 'socket:ack:success', { response });
        }
      });
      
      logSocketEvent('message:send', {
        message_id: userMessageId,
        response_id: assistantMessageId
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      trace(assistantMessageId, 'socket:error', { error: errorMessage });
      errorStreamingMessage(assistantMessageId, errorMessage);
      setError(errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      
      toast.error(`Failed to send message: ${errorMessage}`);
    } finally {
      setSending(false);
    }
  }, [
    socket,
    setSending, 
    setError, 
    addMessage, 
    conversationId, 
    threadId, 
    trace, 
    onError,
    createStreamingMessage, 
    errorStreamingMessage
  ]);
  
  /**
   * Process an incoming message from the server
   * Validates and adds the message to the state
   */
  const processIncomingMessage = useCallback((message: any) => {
    // It's a new message from somewhere else (like another client)
    trace(message.id, 'process:new-message', message);
    
    // Add message to store
    const newMessage: ExtendedChatMessage = {
      id: message.id,
      role: message.role,
      content: message.content || '',
      status: 'sent',
      createdAt: message.timestamp || new Date().toISOString(),
      type: message.type || 'text',
      metadata: {
        ...message.metadata || {},
        fromRemote: true
      }
    };
    
    // Only add these properties if they exist
    if (message.conversation_id) newMessage.conversationId = message.conversation_id;
    if (message.thread_id) newMessage.threadId = message.thread_id;
    
    messageDeduplicator.trackMessage(message.id);
    addMessage(newMessage);
    
    return newMessage;
  }, [trace, addMessage]);
  
  return {
    sendMessage,
    processIncomingMessage
  };
} 