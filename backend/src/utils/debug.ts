/**
 * Debug utility for consistent logging across the application
 * This ensures all MCP logs are properly formatted and don't appear as errors
 */

import debugModule from 'debug';

// Configure debug to use stdout instead of stderr for all non-error loggers
// This prevents all debug logs from showing up as errors in the console
debugModule.log = console.info.bind(console);

/**
 * Creates a logger for the given namespace
 * Regular logs go to stdout and errors go to stderr
 */
export function createLogger(namespace: string) {
  return {
    /**
     * Log regular information. These will appear as INFO in the console.
     */
    log: debugModule(namespace),
    
    /**
     * Log errors. These will properly appear as ERROR in the console.
     */
    error: (...args: any[]) => {
      // Use stderr directly for errors
      const errorLogger = debugModule(`${namespace}:error`);
      errorLogger.log = console.error.bind(console);
      errorLogger(...args);
    }
  };
}

export default createLogger; 