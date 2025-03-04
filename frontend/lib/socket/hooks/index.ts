/**
 * Socket hooks module index
 * Re-exports all socket hooks for easy importing
 */

import * as React from 'react';
import { useSocket } from './use-socket';
import { 
  useSocketEvent, 
  useSocketEventsWithNames, 
  logSocketEvent 
} from './use-socket-event';
import { useSocketEmit } from './use-socket-emit';
import type { StreamEvent } from '../core';

/**
 * Hook for listening to chat model token streaming events
 * @param callback Function to call when a token is received
 * @param deps Dependency array for the effect
 */
export function useChatModelStream(
  callback: (token: string, messageId: string, metadata: Record<string, any>) => void,
  deps: React.DependencyList = []
): void {
  useSocketEvent('stream:event', (event: StreamEvent) => {
    if (event.event === 'on_chat_model_stream' && event.data?.chunk?.content) {
      const token = event.data.chunk.content;
      const messageId = event.run_id;
      callback(token, messageId, event.metadata || {});
    }
  }, deps);
}

/**
 * Hook for listening to chat model completion events
 * @param callback Function to call when a model or chain completes
 * @param deps Dependency array for the effect
 */
export function useChatModelComplete(
  callback: (messageId: string, metadata: Record<string, any>) => void,
  deps: React.DependencyList = []
): void {
  useSocketEvent('stream:event', (event: StreamEvent) => {
    if (event.event === 'on_chat_model_end' || event.event === 'on_chain_end') {
      const messageId = event.run_id;
      callback(messageId, event.metadata || {});
    }
  }, deps);
}

/**
 * Hook for listening to chat model error events
 * @param callback Function to call when an error occurs
 * @param deps Dependency array for the effect
 */
export function useChatModelError(
  callback: (error: any, messageId: string, metadata: Record<string, any>) => void,
  deps: React.DependencyList = []
): void {
  useSocketEvent('stream:event', (event: StreamEvent) => {
    if (event.event === 'on_chain_error' || event.event === 'on_chat_model_error') {
      const error = event.data?.error;
      const messageId = event.run_id;
      callback(error, messageId, event.metadata || {});
    }
  }, deps);
}

/**
 * Hook for listening to thread state update events
 * @param threadId The thread ID to listen for updates on
 * @param callback Function to call when the thread state changes
 * @param deps Dependency array for the effect
 */
export function useThreadStateUpdates(
  threadId: string | null,
  callback: (data: any) => void,
  deps: React.DependencyList = []
): void {
  const { socket } = useSocket();
  
  React.useEffect(() => {
    if (!threadId || !socket) return;
    
    // Join the thread room to receive updates
    socket.emit('subscribe:thread', threadId);
    
    // Return cleanup function
    return () => {
      if (socket) {
        socket.emit('unsubscribe:thread', threadId);
      }
    };
  }, [socket, threadId]);
  
  // Listen for state updates
  useSocketEvent('state_updated', (data) => {
    if (data.threadId === threadId) {
      callback(data);
    }
  }, [...deps, threadId]);
}

/**
 * Hook for listening to conversation state update events
 * @param conversationId The conversation ID to listen for updates on
 * @param callback Function to call when any conversation state changes
 * @param deps Dependency array for the effect
 */
export function useConversationStateUpdates(
  conversationId: string | null,
  callback: (data: any) => void,
  deps: React.DependencyList = []
): void {
  const { socket } = useSocket();
  
  React.useEffect(() => {
    if (!conversationId || !socket) return;
    
    // Join the conversation room to receive updates
    socket.emit('subscribe:conversation', conversationId);
    
    // Return cleanup function
    return () => {
      if (socket) {
        socket.emit('unsubscribe:conversation', conversationId);
      }
    };
  }, [socket, conversationId]);
  
  // Listen for state updates
  useSocketEvent('state_updated', (data) => {
    if (data.conversationId === conversationId) {
      callback(data);
    }
  }, [...deps, conversationId]);
}

/**
 * Hook for listening to streaming state updates
 * @param messageId The message ID to listen for streaming updates
 * @param callback Function to call when streaming state updates
 * @param deps Dependency array for the effect
 */
export function useStreamingStateUpdates(
  messageId: string | null,
  callback: (data: any) => void,
  deps: React.DependencyList = []
): void {
  // Listen for streaming updates and completions
  useSocketEventsWithNames(
    ['stream_updated', 'stream_completed'], 
    (eventName, data) => {
      if (data.messageId === messageId) {
        callback({ ...data, eventType: eventName });
      }
    },
    [...deps, messageId]
  );
}

// Re-export all socket hooks
export {
  useSocket,
  useSocketEvent,
  useSocketEventsWithNames,
  useSocketEmit,
  logSocketEvent
}; 