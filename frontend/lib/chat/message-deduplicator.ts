import { ExtendedChatMessage } from '@/types/chat';

/**
 * Message tracking cache to prevent duplicates
 * The cache uses a limited-size LRU-like approach to track recent messages
 */
class MessageDeduplicator {
  /** Set of tracked message IDs */
  private messageIds: Set<string> = new Set();
  
  /** Set of message event fingerprints (message_id + event) */
  private eventFingerprints: Set<string> = new Set();
  
  /** Maximum tracked message IDs before pruning */
  private readonly maxMessageIds: number;
  
  /** Maximum tracked events before pruning */
  private readonly maxEvents: number;
  
  /** Debug mode flag */
  private readonly debug: boolean;
  
  /**
   * Create a new MessageDeduplicator instance
   * @param options Configuration options
   */
  constructor(
    options: {
      maxMessageIds?: number;
      maxEvents?: number;
      debug?: boolean;
    } = {}
  ) {
    this.maxMessageIds = options.maxMessageIds || 100;
    this.maxEvents = options.maxEvents || 500;
    this.debug = options.debug || false;
  }
  
  /**
   * Check if a message with the given ID already exists
   * @param messageId Message ID to check
   * @returns Whether the message exists
   */
  public hasMessage(messageId: string): boolean {
    const exists = this.messageIds.has(messageId);
    
    if (this.debug) {
      console.debug(`[Deduplicator] Message ${messageId} ${exists ? 'exists' : 'is new'}`);
    }
    
    return exists;
  }
  
  /**
   * Track a message ID
   * @param messageId Message ID to track
   */
  public trackMessage(messageId: string): void {
    // Add to tracked IDs
    this.messageIds.add(messageId);
    
    // Prune if we exceed the limit
    if (this.messageIds.size > this.maxMessageIds) {
      this.pruneMessageIds();
    }
    
    if (this.debug) {
      console.debug(`[Deduplicator] Tracking message ${messageId}, total: ${this.messageIds.size}`);
    }
  }
  
  /**
   * Check if we've seen a specific event for a message
   * @param messageId Message ID
   * @param eventType Event type (e.g., 'created', 'chunk', 'complete')
   * @returns Whether we've seen this event before
   */
  public hasEvent(messageId: string, eventType: string): boolean {
    const fingerprint = `${messageId}:${eventType}`;
    const exists = this.eventFingerprints.has(fingerprint);
    
    if (this.debug) {
      console.debug(`[Deduplicator] Event ${fingerprint} ${exists ? 'exists' : 'is new'}`);
    }
    
    return exists;
  }
  
  /**
   * Track a message event
   * @param messageId Message ID
   * @param eventType Event type
   */
  public trackEvent(messageId: string, eventType: string): void {
    const fingerprint = `${messageId}:${eventType}`;
    
    // Add to tracked fingerprints
    this.eventFingerprints.add(fingerprint);
    
    // Prune if we exceed the limit
    if (this.eventFingerprints.size > this.maxEvents) {
      this.pruneEvents();
    }
    
    if (this.debug) {
      console.debug(`[Deduplicator] Tracking event ${fingerprint}, total: ${this.eventFingerprints.size}`);
    }
  }
  
  /**
   * Check if a message is a duplicate and track it if it's new
   * @param messageId Message ID to check and track
   * @returns Whether the message is a duplicate
   */
  public checkAndTrackMessage(messageId: string): boolean {
    const isDuplicate = this.hasMessage(messageId);
    
    if (!isDuplicate) {
      this.trackMessage(messageId);
    }
    
    return isDuplicate;
  }
  
  /**
   * Check if an event is a duplicate and track it if it's new
   * @param messageId Message ID
   * @param eventType Event type
   * @returns Whether the event is a duplicate
   */
  public checkAndTrackEvent(messageId: string, eventType: string): boolean {
    const isDuplicate = this.hasEvent(messageId, eventType);
    
    if (!isDuplicate) {
      this.trackEvent(messageId, eventType);
    }
    
    return isDuplicate;
  }
  
  /**
   * Check if a stream chunk is a duplicate for a specific message
   * @param messageId Message ID
   * @param chunkIndex Index or identifier for the chunk 
   * @returns Whether the chunk is a duplicate
   */
  public checkAndTrackChunk(messageId: string, chunkIndex: number | string): boolean {
    return this.checkAndTrackEvent(messageId, `chunk:${chunkIndex}`);
  }
  
  /**
   * Reset the deduplicator and clear all tracked messages and events
   */
  public reset(): void {
    this.messageIds.clear();
    this.eventFingerprints.clear();
    
    if (this.debug) {
      console.debug('[Deduplicator] Reset complete');
    }
  }
  
  /**
   * Check if a message already exists in the given array
   * @param messages Array of messages to check
   * @param messageId Message ID to check for
   * @returns Whether the message exists in the array
   */
  public static messageExistsInArray(messages: ExtendedChatMessage[], messageId: string): boolean {
    return messages.some((message) => message.id === messageId);
  }
  
  /**
   * Prune message IDs when we exceed the limit
   * Removes the oldest 20% of entries
   */
  private pruneMessageIds(): void {
    const removeCount = Math.ceil(this.maxMessageIds * 0.2);
    const iterator = this.messageIds.values();
    
    for (let i = 0; i < removeCount; i++) {
      const { value } = iterator.next();
      if (value) {
        this.messageIds.delete(value);
      }
    }
    
    if (this.debug) {
      console.debug(`[Deduplicator] Pruned ${removeCount} message IDs`);
    }
  }
  
  /**
   * Prune events when we exceed the limit
   * Removes the oldest 20% of entries
   */
  private pruneEvents(): void {
    const removeCount = Math.ceil(this.maxEvents * 0.2);
    const iterator = this.eventFingerprints.values();
    
    for (let i = 0; i < removeCount; i++) {
      const { value } = iterator.next();
      if (value) {
        this.eventFingerprints.delete(value);
      }
    }
    
    if (this.debug) {
      console.debug(`[Deduplicator] Pruned ${removeCount} events`);
    }
  }
}

// Export a singleton instance
export const messageDeduplicator = new MessageDeduplicator({
  debug: process.env.NODE_ENV === 'development'
});

export default messageDeduplicator; 