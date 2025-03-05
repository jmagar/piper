/**
 * Type declarations for logger module
 */

declare module '*/utils/logger.js' {
  export class Logger {
    constructor(namespace: string);
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
  }
  
  export const logger: any;
} 