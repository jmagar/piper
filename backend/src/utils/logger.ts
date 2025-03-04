/**
 * Logger utility for consistent logging across the application
 * Provides a class-based interface for logging with namespaces
 */

import debugModule from 'debug';

/**
 * Logger class for consistent logging with namespaces
 */
export class Logger {
  private _namespace: string;
  private debugLogger: debugModule.Debugger;
  private errorLogger: debugModule.Debugger;

  /**
   * Create a new logger with the specified namespace
   * @param namespace The namespace for this logger instance
   */
  constructor(namespace: string) {
    this._namespace = namespace;
    this.debugLogger = debugModule(namespace);
    
    // Configure error logger to use stderr
    this.errorLogger = debugModule(`${namespace}:error`);
    this.errorLogger.log = console.error.bind(console);
    
    // Ensure regular logs go to stdout
    this.debugLogger.log = console.info.bind(console);
  }

  /**
   * Get the namespace for this logger
   */
  get namespace(): string {
    return this._namespace;
  }

  /**
   * Log informational message
   * @param message The message to log
   * @param args Additional arguments to log
   */
  info(message: string, ...args: any[]): void {
    this.debugLogger(message, ...args);
  }

  /**
   * Log warning message
   * @param message The message to log
   * @param args Additional arguments to log
   */
  warn(message: string, ...args: any[]): void {
    this.debugLogger(`⚠️ ${message}`, ...args);
  }

  /**
   * Log error message
   * @param message The message to log
   * @param args Additional arguments to log
   */
  error(message: string, ...args: any[]): void {
    this.errorLogger(message, ...args);
  }

  /**
   * Log debug message
   * @param message The message to log
   * @param args Additional arguments to log
   */
  debug(message: string, ...args: any[]): void {
    this.debugLogger(`🔍 ${message}`, ...args);
  }
}

export default Logger; 