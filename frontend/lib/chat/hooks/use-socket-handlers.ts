'use client';

import { useEffect } from 'react';
import { useSocket, useSocketEvent } from '@/lib/socket/hooks';
import { useChatState } from './use-chat-state';
import { useChatMessages } from './use-chat-messages';
import { useChatStreaming } from './use-chat-streaming';
import { validateMessage } from '@/lib/chat/message-validator';
import { messageDeduplicator } from '@/lib/chat/message-deduplicator';

const DEBUG_CHAT = true;
const debug = (...args: any[]) => DEBUG_CHAT && console.log('[SOCKET HANDLERS]', ...args);

/**
 * Hook that sets up socket event handlers for chat functionality
 */
export function useSocketHandlers(options: { 
  enableTrace?: boolean;
  onError?: (error: Error) => void;
} = {}) {
  const { enableTrace = false, onError } = options;
  
  const { socket } = useSocket();
  const { conversationId, addSocketEvent, loadMessages } = useChatState({ enableTrace });
  
  // Fix the type issues by using type assertion
  const { processIncomingMessage } = useChatMessages({ 
    enableTrace, 
    ...(onError ? { onError } : {})
  });
  
  const { 
    handleStreamStart,
    handleStreamChunk,
    handleStreamComplete,
    handleStreamError
  } = useChatStreaming({ 
    enableTrace, 
    ...(onError ? { onError } : {})
  });
  
  // Handle chat message events
  useSocketEvent('chat:message', (data) => {
    addSocketEvent('chat:message', data);
    
    // Skip if we've seen this exact event before
    if (data.message_id && messageDeduplicator.checkAndTrackEvent(data.message_id, `message:${data.action}`)) {
      return;
    }
    
    // Handle different message events
    if (data.action === 'created') {
      // Check if this is a new message that wasn't initiated by us
      if (data.message_id && !messageDeduplicator.hasMessage(data.message_id)) {
        // Validate message data
        const validation = validateMessage(data, true);
        if (!validation.isValid) {
          if (validation.isCritical) {
            debug('Invalid message received, skipping due to critical issues:', validation.issues);
            return;
          }
          debug('Message has non-critical validation issues:', validation.issues);
        }
        
        // Process the message
        processIncomingMessage(data);
      } else {
        debug('Duplicate message, skipping:', data.message_id);
      }
    }
  }, [processIncomingMessage, addSocketEvent]);
  
  // Handle streaming events
  useSocketEvent('stream:start', handleStreamStart, [handleStreamStart]);
  useSocketEvent('stream:chunk', handleStreamChunk, [handleStreamChunk]);
  useSocketEvent('stream:complete', handleStreamComplete, [handleStreamComplete]);
  useSocketEvent('stream:error', handleStreamError, [handleStreamError]);
  
  // Handle reconnection events
  useEffect(() => {
    if (!socket) return;
    
    const handleReconnect = () => {
      // Re-fetch messages if needed
      if (conversationId) {
        loadMessages(conversationId);
      }
    };
    
    try {
      // Use the connect event instead of reconnect
      socket.on('connect', handleReconnect);
      
      return () => {
        socket.off('connect', handleReconnect);
      };
    } catch (error) {
      debug('Error setting up reconnection handler:', error);
      return () => {}; // Return empty cleanup function to fix the missing return path
    }
  }, [socket, conversationId, loadMessages]);
  
  return { socket };
} 