import * as React from 'react';
import { useSocket } from './socket-provider';
import { logEvent } from '@/lib/utils/logger';

/**
 * Hook for emitting socket events
 * 
 * @returns A function to emit socket events with optional response
 * 
 * Note: We use `(socket as any).emit` to handle dynamic event names while maintaining
 * a flexible API. This approach allows emitting events that might be defined
 * in extended interfaces while avoiding TypeScript constraints on the event parameter.
 * Domain-specific hooks should narrow these types appropriately.
 */
export function useSocketEmit() {
  const { socket, isConnected } = useSocket();
  
  return React.useCallback(
    <T = any, R = void>(
      event: string, 
      data: T, 
      expectResponse = false, 
      timeout = 10000
    ): Promise<R> => {
      if (!socket || !isConnected) {
        const error = 'Socket not connected';
        logEvent('error', `Cannot emit event (${event}): ${error}`, { namespace: 'socket-emit' });
        return Promise.reject(new Error(error));
      }
      
      logEvent('debug', `Emitting socket event: ${event}`, { 
        namespace: 'socket-emit',
        data
      });
      
      if (expectResponse) {
        return new Promise<R>((resolve, reject) => {
          // Set up timeout
          const timeoutId = setTimeout(() => {
            const error = `Socket response timeout for event: ${event}`;
            logEvent('error', error, { namespace: 'socket-emit' });
            reject(new Error(error));
          }, timeout);
          
          // Emit event with callback
          (socket as any).emit(event, data, (response: { error?: string; data?: R; message?: R }) => {
            clearTimeout(timeoutId);
            
            if (response.error) {
              logEvent('error', `Socket response error for ${event}: ${response.error}`, { 
                namespace: 'socket-emit'
              });
              reject(new Error(response.error));
            } else {
              // Allow for either data or message in the response
              const result = response.data || response.message;
              logEvent('debug', `Socket response for ${event} received`, { 
                namespace: 'socket-emit',
                data: result
              });
              resolve(result as R);
            }
          });
        });
      } else {
        (socket as any).emit(event, data);
        return Promise.resolve() as Promise<R>;
      }
    },
    [socket, isConnected]
  );
} 