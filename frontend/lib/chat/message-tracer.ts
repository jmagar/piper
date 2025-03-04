/**
 * Message Tracer
 *
 * Provides utilities for tracing message lifecycle across the application
 */

import { useChatStore } from '@/store/chat-store';
import { ExtendedChatMessage } from '@/types/chat';

// Whether debug tracing is enabled
const DEBUG_TRACE = true;

// Trace categories for organization
export enum TraceCategory {
  CREATION = 'CREATION',
  UPDATE = 'UPDATE',
  RENDER = 'RENDER',
  SOCKET = 'SOCKET',
  STREAM = 'STREAM',
  ERROR = 'ERROR',
  STATE = 'STATE',
  VALIDATION = 'VALIDATION'
}

// Types for trace data
export type TraceData =
  | ExtendedChatMessage
  | Record<string, unknown>
  | Error
  | string
  | number
  | boolean
  | null
  | undefined;

// Structure for a trace entry
export interface TraceEntry {
  messageId: string;
  stage: string;
  data: TraceData;
  category: TraceCategory;
  timestamp: string;
}

/**
 * Traces a message throughout its lifecycle with consistent formatting
 * @param id - Message ID
 * @param stage - Current stage of the message (e.g., "created", "updated", "rendered")
 * @param data - Any relevant data for this trace point
 * @param category - Optional category for organization
 */
export function traceMessage(
  id: string,
  stage: string,
  data: TraceData,
  category: TraceCategory = TraceCategory.STATE
): void {
  if (!DEBUG_TRACE) return;
  
  // Format timestamp for better readability
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 23);
  
  // Add to store for persistent tracking
  useChatStore.getState().addMessageTrace(id, stage, data);
  
  // Format data for logging - keep it concise
  const logData = typeof data === 'object' ? formatMessageData(data) : data;
  
  // Use consistent color-coded logging for easier visual tracking
  console.log(
    `%cMESSAGE[${id}] %c${category} %c${stage} %c${timestamp}`,
    'color: #9c27b0; font-weight: bold;',
    `color: ${getCategoryColor(category)}; font-weight: bold;`,
    'color: #2196f3;',
    'color: #888;',
    logData
  );
}

/**
 * Format message data to be more concise for logging
 */
function formatMessageData(data: Record<string, unknown> | Error | ExtendedChatMessage | null): unknown {
  if (!data) return 'null';
  
  // Handle Error objects
  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: data.stack ? data.stack.split('\n')[0] : undefined
    };
  }
  
  // Handle message objects specially
  if (
    'id' in data &&
    typeof data.id === 'string' &&
    'role' in data &&
    'content' in data
  ) {
    const { id, role, status, content, ...rest } = data as {
      id: string;
      role: string;
      status?: string;
      content: string;
      [key: string]: unknown;
    };
    
    const metadata = 'metadata' in rest ? rest.metadata as Record<string, unknown> : undefined;
    
    return {
      id,
      role,
      status,
      content: typeof content === 'string'
        ? `${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`
        : content,
      metaKeys: metadata ? Object.keys(metadata) : [],
      ...getCompactObject(rest as Record<string, unknown>, ['metadata', 'conversationId', 'threadId'])
    };
  }
  
  if (Array.isArray(data)) {
    return `Array(${data.length})`;
  }
  
  return data;
}

/**
 * Returns a more compact representation of an object
 */
function getCompactObject(
  obj: Record<string, unknown>,
  excludedKeys: string[] = []
): Record<string, unknown> {
  if (typeof obj !== 'object' || obj === null) return {};
  
  const result: Record<string, unknown> = {};
  
  for (const key in obj) {
    if (excludedKeys.includes(key)) continue;
    
    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        result[key] = `Array(${value.length})`;
      } else {
        result[key] = `{${Object.keys(value as object).join(', ')}}`;
      }
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Get a color for a category to keep logging consistent
 */
function getCategoryColor(category: TraceCategory): string {
  switch (category) {
    case TraceCategory.CREATION:
      return '#4caf50'; // Green
    case TraceCategory.UPDATE:
      return '#2196f3'; // Blue
    case TraceCategory.RENDER:
      return '#9c27b0'; // Purple
    case TraceCategory.SOCKET:
      return '#ff9800'; // Orange
    case TraceCategory.STREAM:
      return '#00bcd4'; // Cyan
    case TraceCategory.ERROR:
      return '#f44336'; // Red
    case TraceCategory.STATE:
      return '#607d8b'; // Blue Gray
    case TraceCategory.VALIDATION:
      return '#ff5722'; // Deep Orange
    default:
      return '#757575'; // Gray
  }
}

/**
 * Creates a scoped message tracer for a specific message
 * More convenient for tracing a message throughout a component
 */
export function createMessageTracer(messageId: string) {
  return {
    trace: (stage: string, data: TraceData, category: TraceCategory = TraceCategory.STATE) => {
      traceMessage(messageId, stage, data, category);
    },
    creation: (data: TraceData) => traceMessage(messageId, 'created', data, TraceCategory.CREATION),
    update: (data: TraceData) => traceMessage(messageId, 'updated', data, TraceCategory.UPDATE),
    render: (data: TraceData) => traceMessage(messageId, 'rendered', data, TraceCategory.RENDER),
    socket: (event: string, data: TraceData) => traceMessage(messageId, event, data, TraceCategory.SOCKET),
    stream: (data: TraceData) => traceMessage(messageId, 'stream-chunk', data, TraceCategory.STREAM),
    streamComplete: (data: TraceData) => traceMessage(messageId, 'stream-complete', data, TraceCategory.STREAM),
    error: (error: Error | string) => traceMessage(messageId, 'error', error, TraceCategory.ERROR),
    validation: (result: TraceData) => traceMessage(messageId, 'validation', result, TraceCategory.VALIDATION),
  };
}

/**
 * Hook for message tracing within React components
 */
export function useMessageTracer(messageId: string) {
  return createMessageTracer(messageId);
}