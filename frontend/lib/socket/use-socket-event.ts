import * as React from 'react';
import { useSocket } from '../socket';
import type { Socket, ServerToClientEvents } from '@/types/socket';

type EventNames = keyof ServerToClientEvents;
type EventCallback<E extends EventNames> = ServerToClientEvents[E];

/**
 * Hook to listen for socket events
 * @param eventName - The name of the event to listen for
 * @param callback - The callback function to execute when the event occurs
 * @param deps - Additional dependencies for the effect
 */
export function useSocketEvent<E extends EventNames>(
  eventName: E,
  callback: EventCallback<E>,
  deps: React.DependencyList = []
) {
  const { socket } = useSocket();
  
  // Use a ref to avoid recreating the event listener on every render
  const callbackRef = React.useRef(callback);
  
  // Update the callback ref when the callback changes
  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Set up the event listener
  React.useEffect(() => {
    // Skip if socket is not available
    if (!socket) return () => {};
    
    // Create a wrapper function to call the current callback from the ref
    const handler = ((...args: any[]) => {
      callbackRef.current(...args);
    }) as EventCallback<E>;
    
    // Add the event listener to the socket
    socket.on(eventName, handler);
    
    // Clean up the event listener when unmounting
    return () => {
      socket.off(eventName, handler);
    };
  }, [socket, eventName, ...deps]);
}

export default useSocketEvent;