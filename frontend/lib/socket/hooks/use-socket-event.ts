/**
 * Socket Event Hooks
 * 
 * This file provides React hooks for listening to Socket.IO events.
 * It allows components to subscribe to socket events with proper TypeScript typing
 * and handles cleanup when components unmount.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from './use-socket';

/**
 * Socket event type assertion
 * This helps bypass strict Socket.IO event type checking 
 * by asserting the event name can be used with socket methods
 */
const asEventName = (event: string): any => event;

/**
 * Options for socket event hooks
 */
export interface UseSocketEventOptions {
  /**
   * Whether to connect to socket if not already connected
   * @default true
   */
  autoConnect?: boolean;
  
  /**
   * Whether to log events to console
   * @default false in production, true in development
   */
  debug?: boolean;
  
  /**
   * Whether to show toast notifications for errors
   * @default false
   */
  showToasts?: boolean;
  
  /**
   * Whether to automatically reconnect when connection is lost
   * @default false
   */
  autoReconnect?: boolean;
}

/**
 * Log socket events for debugging
 */
export function logSocketEvent(eventName: string, data: any) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Socket] ${eventName}:`, data);
  }
}

/**
 * Hook to listen for a specific socket event
 * 
 * @param eventName - The name of the event to listen for
 * @param handler - The callback function to call when the event is received
 * @param deps - Dependencies that should trigger recreating the handler
 * @param options - Additional options for event handling
 * 
 * @example
 * ```tsx
 * // Listen for a "chat:message" event
 * useSocketEvent('chat:message', (message) => {
 *   console.log('New message:', message);
 * });
 * ```
 */
export function useSocketEvent<T = any>(
  eventName: string,
  handler: (data: T) => void,
  deps: React.DependencyList = [],
  options: UseSocketEventOptions = {}
) {
  const { socket, isConnected, reconnect } = useSocket();
  const { 
    autoConnect = true, 
    debug = process.env.NODE_ENV !== 'production'
  } = options;
  
  // Keep a reference to the latest handler to avoid recreation on each render
  const handlerRef = useRef(handler);

  // Update the handler ref when the handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  // Connect to socket if not already connected and autoConnect is true
  useEffect(() => {
    if (autoConnect && socket && !isConnected) {
      reconnect();
    }
  }, [autoConnect, socket, isConnected, reconnect]);

  // Set up the event listener
  useEffect(() => {
    if (!socket) return;
    
    // Add some debugging if enabled
    if (debug) {
      console.debug(`[Socket] Setting up listener for event: ${eventName}`);
    }
    
    // Create a wrapper function that calls the current handler
    const eventHandler = ((data: T) => {
      if (debug) {
        logSocketEvent(eventName, data);
      }
      handlerRef.current(data);
    }) as any;
    
    // Add the event listener
    socket.on(asEventName(eventName), eventHandler);
    
    // Clean up on unmount
    return () => {
      if (socket) {
        socket.off(asEventName(eventName), eventHandler);
        if (debug) {
          console.debug(`[Socket] Removed listener for event: ${eventName}`);
        }
      }
    };
  }, [socket, eventName, debug, ...deps]);
  
  // Return an object with methods to emit events
  // This allows the component to both listen for and emit events
  return {
    emit: useCallback((data: any) => {
      if (!socket || !isConnected) {
        if (debug) {
          console.warn(`[Socket] Cannot emit event ${eventName}: socket ${!socket ? 'not initialized' : 'not connected'}`);
        }
        return false;
      }
      
      if (debug) {
        console.debug(`[Socket] Emitting event: ${eventName}`, data);
      }
      
      socket.emit(asEventName(eventName), data);
      return true;
    }, [socket, isConnected, eventName, debug]),
    
    socket,
    isConnected,
    reconnect
  };
}

/**
 * Hook to listen for multiple socket events with a single handler
 * 
 * @param eventNames - Array of event names to listen for
 * @param handler - Callback function that receives the event name and data
 * @param deps - Dependencies that should trigger recreating the handler
 * @param options - Additional options for event handling
 * 
 * @example
 * ```tsx
 * // Listen for multiple chat events
 * useSocketEventsWithNames(
 *   ['chat:message', 'chat:typing', 'chat:read'],
 *   (eventName, data) => {
 *     console.log(`Received ${eventName}:`, data);
 *   }
 * );
 * ```
 */
export function useSocketEventsWithNames<T = any>(
  eventNames: string[],
  handler: (eventName: string, data: T) => void,
  deps: React.DependencyList = [],
  options: UseSocketEventOptions = {}
) {
  const { socket, isConnected, reconnect } = useSocket();
  const { 
    autoConnect = true, 
    debug = process.env.NODE_ENV !== 'production'
  } = options;
  
  // Keep a reference to the latest handler
  const handlerRef = useRef(handler);
  
  // Update the handler ref when the handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);
  
  // Connect to socket if not already connected and autoConnect is true
  useEffect(() => {
    if (autoConnect && socket && !isConnected) {
      reconnect();
    }
  }, [autoConnect, socket, isConnected, reconnect]);
  
  // Set up the event listeners
  useEffect(() => {
    if (!socket) return;
    
    if (debug) {
      console.debug(`[Socket] Setting up listeners for events:`, eventNames);
    }
    
    // Create a map to store event handlers
    const eventHandlers: Record<string, any> = {};
    
    // Add listeners for each event
    eventNames.forEach(eventName => {
      const eventHandler = ((data: T) => {
        if (debug) {
          logSocketEvent(eventName, data);
        }
        handlerRef.current(eventName, data);
      }) as any;
      
      eventHandlers[eventName] = eventHandler;
      socket.on(asEventName(eventName), eventHandler);
    });
    
    // Clean up on unmount
    return () => {
      if (socket) {
        eventNames.forEach(eventName => {
          socket.off(asEventName(eventName), eventHandlers[eventName]);
          if (debug) {
            console.debug(`[Socket] Removed listener for event: ${eventName}`);
          }
        });
      }
    };
  }, [socket, JSON.stringify(eventNames), debug, ...deps]);
  
  return {
    socket,
    isConnected,
    reconnect
  };
}

/**
 * Hook to emit a socket event and optionally wait for an acknowledgement
 * 
 * @param eventName - The name of the event to emit
 * @param options - Additional options for event handling
 * @returns A function that emits the event and returns a promise with the result
 * 
 * @example
 * ```tsx
 * const { emitWithAck } = useSocketEmit('chat:message');
 * 
 * const sendMessage = async (message) => {
 *   try {
 *     const result = await emitWithAck(message);
 *     console.log('Message sent successfully:', result);
 *   } catch (error) {
 *     console.error('Failed to send message:', error);
 *   }
 * };
 * ```
 */
export function useSocketEmit<TArgs = any, TAck = any>(
  eventName: string,
  options: UseSocketEventOptions = {}
) {
  const { socket, isConnected, reconnect } = useSocket();
  const { autoConnect = true, debug = process.env.NODE_ENV !== 'production' } = options;
  
  // Connect to socket if not already connected and autoConnect is true
  useEffect(() => {
    if (autoConnect && socket && !isConnected) {
      reconnect();
    }
  }, [autoConnect, socket, isConnected, reconnect]);
  
  // Function to emit an event without waiting for acknowledgement
  const emit = useCallback((data: TArgs) => {
    if (!socket || !isConnected) {
      if (debug) {
        console.debug(`[Socket] Cannot emit event ${eventName}: socket ${!socket ? 'not initialized' : 'not connected'}`);
      }
      return false;
    }
    
    if (debug) {
      console.debug(`[Socket] Emitting event: ${eventName}`, data);
    }
    
    socket.emit(asEventName(eventName), data);
    return true;
  }, [socket, isConnected, eventName, debug]);
  
  // Function to emit an event and wait for acknowledgement
  const emitWithAck = useCallback((data: TArgs): Promise<TAck> => {
    return new Promise((resolve, reject) => {
      if (!socket || !isConnected) {
        reject(new Error(`Socket ${!socket ? 'not initialized' : 'not connected'}`));
        return;
      }
      
      if (debug) {
        console.debug(`[Socket] Emitting event with ack: ${eventName}`, data);
      }
      
      socket.timeout(10000).emit(asEventName(eventName), data, (err: Error | null, response: TAck) => {
        if (err) {
          if (debug) {
            console.debug(`[Socket] Event ${eventName} acknowledgement error:`, err);
          }
          reject(err);
        } else {
          if (debug) {
            console.debug(`[Socket] Event ${eventName} acknowledged with:`, response);
          }
          resolve(response);
        }
      });
    });
  }, [socket, isConnected, eventName, debug]);
  
  return { emit, emitWithAck };
}

export default useSocketEvent;
