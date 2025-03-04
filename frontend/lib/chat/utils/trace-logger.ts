'use client';

const DEBUG_TRACE = true;

/**
 * Message trace logger for debugging
 * Logs message journey events with timestamps for debugging
 * @param messageId The message ID
 * @param event The event name
 * @param data Additional data to log
 */
export function traceMessage(messageId: string, event: string, data: any = {}) {
  if (!DEBUG_TRACE) return;
  
  const timestamp = new Date().toISOString();
  const timestampMs = Date.now();
  
  // Format the message for better readability
  let timeStr = "00:00:00";
  try {
    // Extract time part safely
    const dateObj = new Date(timestamp);
    timeStr = dateObj.toTimeString().split(' ')[0] || timeStr;
  } catch (e) {
    // Keep default time string if parsing fails
  }
  
  const prefix = `[${timeStr}]`;
  
  // Ensure messageId is never undefined before substring operation
  const msgPrefix = messageId ? messageId.substring(0, 6) : 'unknown';
  
  console.log(`${prefix} TRACE [${msgPrefix}...] ${event}`, data, `+${timestampMs % 1000}ms`);
  
  // Track in session storage for debugging
  try {
    // Check if sessionStorage is available (may not be in SSR or if cookies disabled)
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const traces = JSON.parse(sessionStorage.getItem('message-traces') || '{}');
      
      if (!traces[messageId]) {
        traces[messageId] = [];
      }
      
      traces[messageId].push({
        event,
        data,
        timestamp,
        timestampMs
      });
      
      // Keep only the last 100 traces per message to avoid memory issues
      if (traces[messageId].length > 100) {
        traces[messageId] = traces[messageId].slice(-100);
      }
      
      // Limit the total number of tracked messages to 20
      const messageIds = Object.keys(traces);
      if (messageIds.length > 20) {
        const idsToRemove = messageIds.slice(0, messageIds.length - 20);
        idsToRemove.forEach(id => {
          delete traces[id];
        });
      }
      
      sessionStorage.setItem('message-traces', JSON.stringify(traces));
    }
  } catch (e) {
    console.warn('Failed to store message trace:', e);
  }
}

/**
 * Get all trace logs for debugging
 */
export function getAllTraces() {
  try {
    // Check if sessionStorage is available
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return JSON.parse(sessionStorage.getItem('message-traces') || '{}');
    }
    return {};
  } catch (error) {
    console.error('Failed to get traces:', error);
    return {};
  }
}

/**
 * Clear all trace logs
 */
export function clearTraces() {
  try {
    // Check if sessionStorage is available
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem('message-traces');
    }
  } catch (error) {
    console.error('Failed to clear traces:', error);
  }
}

/**
 * Get traces for a specific message
 * @param messageId The message ID to get traces for
 */
export function getMessageTraces(messageId: string) {
  try {
    // Check if sessionStorage is available
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const traces = JSON.parse(sessionStorage.getItem('message-traces') || '{}');
      return traces[messageId] || [];
    }
    return [];
  } catch (error) {
    console.error('Failed to get message traces:', error);
    return [];
  }
} 