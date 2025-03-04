/**
 * LangGraph Event Hooks
 * 
 * Custom hooks for handling LangGraph-style streaming events from Socket.IO
 */

import * as React from 'react';
import { useSocketEvent } from './use-socket-event';
import type { StreamEvent } from '@/types/socket';

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
      callback(token, messageId, event.metadata);
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
      callback(messageId, event.metadata);
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
      callback(error, messageId, event.metadata);
    }
  }, deps);
}

/**
 * Hook for listening to all LangGraph streaming events
 * @param callback Function to call when any stream event is received
 * @param deps Dependency array for the effect
 */
export function useStreamEvents(
  callback: (event: StreamEvent) => void,
  deps: React.DependencyList = []
): void {
  useSocketEvent('stream:event', callback, deps);
} 