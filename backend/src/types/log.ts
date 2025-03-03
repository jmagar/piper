/**
 * Log entry type definitions
 */

/**
 * Represents a log entry that can be sent over WebSocket
 */
export interface LogEntry {
  /**
   * ISO timestamp when the log was created
   */
  timestamp: string;
  
  /**
   * Debug namespace of the log
   */
  namespace: string;
  
  /**
   * Log level
   */
  level: 'info' | 'error' | 'debug';
  
  /**
   * Log message content
   */
  message: string;
  
  /**
   * Source of the log (Backend, Frontend, etc.)
   */
  server?: string;
} 