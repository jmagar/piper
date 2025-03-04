"use client";

import * as React from 'react';
import { useCallback, useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  RefreshCw, Shield, Database, CheckCircle2,
  Server, WifiOff, Zap, MessageSquare, GitCompare, FileWarning,
  Trash2
} from 'lucide-react';
import { useSocket } from '@/lib/socket/hooks/use-socket';
import { useChatStore } from '@/store/chat-store';
import { compareMessageSets, createRepairedMessageSet } from '@/lib/chat/message-validator';
import { Badge } from '@/components/ui/badge';
// Remove unused Toast import
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { formatDistanceToNow } from 'date-fns';

import { traceMessage as traceMessageLib, TraceCategory, TraceData } from '@/lib/chat/message-tracer';
import { useChatState } from '@/lib/chat/hooks/use-chat-state';
import { clearTraces, getAllTraces } from '@/lib/chat/utils/trace-logger';

// Debug trace flag
export const DEBUG_TRACE = process.env.NODE_ENV === 'development' || true;

/**
 * Enhanced message tracer that uses the centralized tracing system
 * This function maintains backward compatibility while using the new system
 *
 * @param messageId Identifier for the message
 * @param event Name of the event in the journey
 * @param data Additional data to log
 * @param category Optional category for better organization
 */
export function traceMessage(
  messageId: string,
  event: string,
  data: TraceData = {},
  category: TraceCategory = TraceCategory.STATE
) {
  if (!DEBUG_TRACE) return;
  
  // Call the enhanced tracing library
  traceMessageLib(messageId, event, data, category);
  
  // Store a reference in the chat store for UI display
  if (!messageId) return;
  
  const trace = {
    timestamp: Date.now(),
    event,
    data,
    category
  };
  
  // Add to the store for persistence
  const safeData = typeof data === 'object' && data !== null && !Array.isArray(data)
    ? { ...data }
    : { value: data };
    
  useChatStore.getState().addMessageTrace(messageId, event, {
    ...safeData,
    _traceCategory: category,
    _traceTimestamp: trace.timestamp
  });
}

/**
 * Helper functions for common message lifecycle events
 */
export const messageLifecycle = {
  created: (messageId: string, data: TraceData) =>
    traceMessage(messageId, 'created', data, TraceCategory.CREATION),
    
  received: (messageId: string, data: TraceData) =>
    traceMessage(messageId, 'received', data, TraceCategory.SOCKET),
    
  updated: (messageId: string, data: TraceData) =>
    traceMessage(messageId, 'updated', data, TraceCategory.UPDATE),
    
  rendered: (messageId: string, data: TraceData) =>
    traceMessage(messageId, 'rendered', data, TraceCategory.RENDER),
    
  streamStart: (messageId: string, data: TraceData) =>
    traceMessage(messageId, 'stream-start', data, TraceCategory.STREAM),
    
  streamChunk: (messageId: string, chunk: string, position: number) =>
    traceMessage(messageId, 'stream-chunk', { chunk, position, length: chunk.length }, TraceCategory.STREAM),
    
  streamComplete: (messageId: string, data: TraceData) =>
    traceMessage(messageId, 'stream-complete', data, TraceCategory.STREAM),
    
  error: (messageId: string, error: Error | string) =>
    traceMessage(messageId, 'error', error, TraceCategory.ERROR),
};

interface ChatDebugProps {
  conversationId?: string;
  threadId?: string; // Keep original prop name for compatibility
  _threadId?: string; // Add underscore version for internal use
  className?: string;
}

interface Trace {
  event: string;
  data: Record<string, any>;
  timestamp: string;
  timestampMs: number;
}

interface Traces {
  [messageId: string]: Trace[];
}

/**
 * Chat Debug component
 * Shows internal state for debugging purposes
 */
export function ChatDebug() {
  const { messages, error, conversationId, threadId } = useChatState();
  const [activeTab, setActiveTab] = useState<'messages' | 'traces' | 'state'>('messages');
  
  const handleClearTraces = () => {
    clearTraces();
  };
  
  const traces = getAllTraces() as Traces;
  
  return (
    <div className="p-4 bg-gray-50 text-xs">
      <div className="font-medium text-gray-900 mb-2">Debug Panel</div>
      
      <div className="flex gap-2 mb-4">
        <button 
          className={`px-2 py-1 rounded ${activeTab === 'messages' ? 'bg-blue-100' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('messages')}
        >
          Messages ({messages.length})
        </button>
        <button 
          className={`px-2 py-1 rounded ${activeTab === 'traces' ? 'bg-blue-100' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('traces')}
        >
          Traces
        </button>
        <button 
          className={`px-2 py-1 rounded ${activeTab === 'state' ? 'bg-blue-100' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('state')}
        >
          State
        </button>
        
        <button 
          className="px-2 py-1 rounded bg-red-100 ml-auto"
          onClick={handleClearTraces}
        >
          Clear Traces
        </button>
      </div>
      
      {activeTab === 'messages' && (
        <div className="space-y-2">
          {messages.map((message) => (
            <div key={message.id} className="border p-2 rounded">
              <div className="font-mono">{message.id.substring(0, 8)}...</div>
              <div>Role: {message.role}</div>
              <div>Status: {message.status}</div>
              <div>Content: {message.content.substring(0, 50)}{message.content.length > 50 ? '...' : ''}</div>
            </div>
          ))}
          
          {messages.length === 0 && (
            <div className="text-gray-500">No messages</div>
          )}
        </div>
      )}
      
      {activeTab === 'traces' && (
        <div className="space-y-2">
          {Object.keys(traces).map((messageId) => (
            <div key={messageId} className="border p-2 rounded">
              <div className="font-mono">{messageId.substring(0, 8)}...</div>
              <div className="mt-1 border-t pt-1">
                {traces[messageId]?.slice(-5).map((trace: Trace, idx: number) => (
                  <div key={idx} className="text-xs mb-1">
                    {trace.event}: {JSON.stringify(trace.data)}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {Object.keys(traces).length === 0 && (
            <div className="text-gray-500">No traces</div>
          )}
        </div>
      )}
      
      {activeTab === 'state' && (
        <div className="space-y-2">
          <div className="border p-2 rounded">
            <div>Conversation ID: {conversationId || 'none'}</div>
            <div>Thread ID: {threadId || 'none'}</div>
            <div>Error: {error || 'none'}</div>
            <div>Message Count: {messages.length}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Ensure Database icon is imported properly
function DatabaseIcon(props: React.SVGProps<SVGSVGElement>) {
  return <Database {...props} />;
}
