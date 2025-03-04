/**
 * Socket Emit Hook
 * 
 * Hook for emitting socket events with proper typing and error handling.
 */

import { useCallback } from 'react';
import { useSocket } from './use-socket';
import type { ClientToServerEvents } from '../core/types';

/**
 * Options for emitting socket events
 */
interface EmitOptions {
  /**
   * Whether to throw errors instead of returning them
   */
  throwErrors?: boolean;
  
  /**
   * Timeout in milliseconds for acknowledgements
   */
  timeout?: number;
}

/**
 * Result of a socket emit operation
 */
interface EmitResult<T> {
  /**
   * Whether the emit was successful
   */
  success: boolean;
  
  /**
   * Response data if successful
   */
  data?: T;
  
  /**
   * Error if unsuccessful
   */
  error?: Error;
}

/**
 * Hook to emit socket events with type safety
 * 
 * @returns Object with emit function
 */
export function useSocketEmit() {
  const { socket, isConnected } = useSocket();
  
  /**
   * Emit a socket event with proper typing
   * 
   * @param eventName - Name of the event to emit
   * @param args - Arguments to pass to the event
   * @param options - Options for the emit operation
   * @returns Promise that resolves with the result of the emit operation
   */
  const emit = useCallback(<K extends keyof ClientToServerEvents>(
    eventName: K,
    ...args: Parameters<ClientToServerEvents[K]> extends [infer A, infer B, ...any[]]
      ? B extends (response: infer R) => void
        ? [A]  // If the second parameter is a callback, only include the first parameter
        : Parameters<ClientToServerEvents[K]>  // Otherwise include all parameters
      : Parameters<ClientToServerEvents[K]>
  ): Promise<EmitResult<any>> => {
    // Check if socket is connected
    if (!socket || !isConnected) {
      const error = new Error(`Cannot emit event: ${String(eventName)} - Socket not connected`);
      console.error(error);
      
      return Promise.resolve({
        success: false,
        error
      });
    }
    
    // Check if the event expects an acknowledgement (callback)
    const eventType = socket.eventNames().includes(eventName);
    const hasCallback = (
      typeof ClientToServerEvents.prototype[eventName as keyof ClientToServerEvents] === 'function' &&
      ClientToServerEvents.prototype[eventName as keyof ClientToServerEvents].length > 1
    );
    
    // If the event doesn't expect an acknowledgement, just emit and return success
    if (!hasCallback) {
      try {
        socket.emit(eventName, ...args);
        return Promise.resolve({ success: true });
      } catch (error) {
        console.error(`Error emitting event ${String(eventName)}:`, error);
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    }
    
    // If the event expects an acknowledgement, return a promise that resolves with the response
    return new Promise((resolve) => {
      try {
        // Create a callback function that resolves the promise
        const callback = (response: any) => {
          if (response && response.error) {
            resolve({
              success: false,
              error: new Error(response.error)
            });
          } else {
            resolve({
              success: true,
              data: response
            });
          }
        };
        
        // Emit the event with the callback
        socket.emit(eventName, args[0], callback);
      } catch (error) {
        console.error(`Error emitting event ${String(eventName)}:`, error);
        resolve({
          success: false,
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    });
  }, [socket, isConnected]);
  
  return { emit };
}

/**
 * Hook to emit a specific socket event with type safety
 * 
 * @param eventName - Name of the event to emit
 * @returns Function to emit the event with the correct parameters
 */
export function useSocketEmitEvent<K extends keyof ClientToServerEvents>(eventName: K) {
  const { emit } = useSocketEmit();
  
  return useCallback((...args: Parameters<ClientToServerEvents[K]> extends [infer A, infer B, ...any[]]
    ? B extends (response: infer R) => void
      ? [A]
      : Parameters<ClientToServerEvents[K]>
    : Parameters<ClientToServerEvents[K]>) => {
    return emit(eventName, ...args);
  }, [emit, eventName]);
} 