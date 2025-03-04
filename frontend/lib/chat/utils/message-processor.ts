'use client';

import { ExtendedChatMessage } from '@/types/chat';

const DEBUG = true;
const debug = (...args: any[]) => DEBUG && console.log('[MESSAGE PROCESSOR]', ...args);

/**
 * Validates a chat message structure
 * @param message The message to validate
 * @param attempt_repair Whether to attempt repairing invalid messages
 * @returns Validation result with potential repairs
 */
export function validateMessage(message: any, attempt_repair = false): {
  isValid: boolean;
  isCritical: boolean;
  issues: string[];
  repairedMessage?: any;
} {
  const issues: string[] = [];
  let repairedMessage = null;
  
  // Check required fields
  if (!message) {
    issues.push('Message is null or undefined');
    return { isValid: false, isCritical: true, issues };
  }
  
  if (!message.id) {
    issues.push('Message has no ID');
  }
  
  if (!message.role) {
    issues.push('Message has no role');
  } else if (!['user', 'assistant', 'system'].includes(message.role)) {
    issues.push(`Invalid role: ${message.role}`);
  }
  
  if (message.content === undefined || message.content === null) {
    issues.push('Message has no content');
  }
  
  // Check for repair possibilities
  if (attempt_repair && issues.length > 0) {
    try {
      repairedMessage = { ...message };
      
      // Add ID if missing
      if (!repairedMessage.id) {
        repairedMessage.id = `generated-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }
      
      // Fix role if invalid
      if (!repairedMessage.role || !['user', 'assistant', 'system'].includes(repairedMessage.role)) {
        repairedMessage.role = 'assistant';
      }
      
      // Ensure content exists
      if (repairedMessage.content === undefined || repairedMessage.content === null) {
        repairedMessage.content = '';
      }
      
      // Ensure metadata exists
      if (!repairedMessage.metadata) {
        repairedMessage.metadata = {};
      }
      
      // Ensure type exists
      if (!repairedMessage.type) {
        repairedMessage.type = 'text';
      }
      
      debug('Repaired message:', { original: message, repaired: repairedMessage });
    } catch (error) {
      debug('Failed to repair message:', error);
      repairedMessage = null;
    }
  }
  
  // Determine if issues are critical
  const isCritical = issues.some(issue => 
    issue.includes('Message is null') || 
    issue.includes('no ID') || 
    issue.includes('no role')
  );
  
  return {
    isValid: issues.length === 0,
    isCritical,
    issues,
    repairedMessage: issues.length > 0 ? repairedMessage : undefined
  };
}

/**
 * Message deduplicator to prevent duplicate messages and events
 */
export class MessageDeduplicator {
  private seenMessages = new Set<string>();
  private seenEvents = new Map<string, Set<string>>();
  private seenChunks = new Map<string, Set<string | number>>();
  
  /**
   * Reset the deduplicator state
   */
  reset() {
    this.seenMessages.clear();
    this.seenEvents.clear();
    this.seenChunks.clear();
    debug('Deduplicator reset');
  }
  
  /**
   * Track a message ID to prevent duplicates
   */
  trackMessage(messageId: string) {
    if (!messageId) return false;
    
    if (this.seenMessages.has(messageId)) {
      return false;
    }
    
    this.seenMessages.add(messageId);
    return true;
  }
  
  /**
   * Check if a message ID has been seen before
   */
  hasMessage(messageId: string) {
    if (!messageId) return false;
    return this.seenMessages.has(messageId);
  }
  
  /**
   * Check and track an event to prevent duplicates
   * @returns true if this event has been seen before
   */
  checkAndTrackEvent(messageId: string, eventName: string) {
    if (!messageId || !eventName) return false;
    
    // Get or create event set for this message
    if (!this.seenEvents.has(messageId)) {
      this.seenEvents.set(messageId, new Set());
    }
    
    const events = this.seenEvents.get(messageId)!;
    
    // Check if this event was already processed
    if (events.has(eventName)) {
      debug(`Duplicate event detected: ${messageId} - ${eventName}`);
      return true;
    }
    
    // Track this event
    events.add(eventName);
    return false;
  }
  
  /**
   * Check and track a chunk to prevent duplicates
   * @returns true if this chunk has been seen before
   */
  checkAndTrackChunk(messageId: string, chunkId: string | number) {
    if (!messageId || !chunkId) return false;
    
    // Get or create chunk set for this message
    if (!this.seenChunks.has(messageId)) {
      this.seenChunks.set(messageId, new Set());
    }
    
    const chunks = this.seenChunks.get(messageId)!;
    
    // Check if this chunk was already processed
    if (chunks.has(chunkId)) {
      debug(`Duplicate chunk detected: ${messageId} - ${chunkId}`);
      return true;
    }
    
    // Track this chunk
    chunks.add(chunkId);
    return false;
  }
}

// Create singleton instance for use throughout the application
export const messageDeduplicator = new MessageDeduplicator(); 