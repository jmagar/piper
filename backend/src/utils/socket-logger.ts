/**
 * Socket Logger Utility
 * 
 * This utility intercepts debug logs and forwards them to connected clients via Socket.IO.
 * It allows frontend components to display backend logs in real-time.
 */

import { Server as SocketIOServer } from 'socket.io';
import debugModule from 'debug';
import type { LogEntry } from '../types/log';

let ioInstance: SocketIOServer | null = null;

/**
 * Initialize the socket logger with a Socket.IO instance
 */
export function initSocketLogger(io: SocketIOServer): void {
  ioInstance = io;
  
  // Store the original debug.log function
  const originalLog = debugModule.log;
  
  // Override the debug.log function to intercept all debug logs
  debugModule.log = function(...args: any[]) {
    // Call the original log function
    originalLog.apply(debugModule, args);
    
    // Skip if no Socket.IO instance or no clients connected
    if (!ioInstance || ioInstance.engine.clientsCount === 0) return;
    
    try {
      // Extract namespace and message
      const namespace = args[0].namespace || 'unknown';
      // Skip namespace with socket: prefix to avoid infinite loops
      if (namespace.startsWith('socket:')) return;
      
      // Convert debug format args to plain message
      // The first argument is the debug instance itself
      // The second argument is the format string
      // The rest are arguments to the format string
      const formatString = args[1];
      const formatArgs = args.slice(2);
      
      // Simple format string replacement (handles %s, %d, %o, etc.)
      let message = "";
      let argIndex = 0;
      
      // Check if formatString is actually a string before trying to replace
      if (typeof formatString === 'string') {
        try {
          message = formatString.replace(/%[sidjoO]/g, (match) => {
            const arg = formatArgs[argIndex++];
            
            // Handle different format specifiers
            switch (match) {
              case '%o':
              case '%O':
              case '%j':
                return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
              default:
                return String(arg);
            }
          });
        } catch (err) {
          // If replace fails, fallback to simple string conversion
          message = String(formatString);
        }
      } else {
        // If formatString is not a string, use direct stringification
        message = String(formatString);
      }
      
      // Create a log entry
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        namespace,
        level: namespace.includes(':error') ? 'error' : 'debug',
        message,
        server: 'Backend'
      };
      
      // Emit the log entry to all connected clients
      ioInstance.emit(`debug:${namespace}`, message);
      ioInstance.emit('mcp:all:logs', logEntry);
    } catch (err) {
      // Don't use debug.error here to avoid infinite loops
      console.error('Failed to forward debug log to socket clients:', err);
    }
  };
}

/**
 * Manually send a log message to connected clients
 */
export function emitLog(namespace: string, level: 'info' | 'error' | 'debug', message: string): void {
  if (!ioInstance) return;
  
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    namespace,
    level,
    message,
    server: 'Backend'
  };
  
  ioInstance.emit(`debug:${namespace}`, message);
  ioInstance.emit('mcp:all:logs', logEntry);
} 