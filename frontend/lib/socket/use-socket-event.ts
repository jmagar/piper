import * as React from 'react';
import { useSocket } from '../socket';
import type { ServerToClientEvents } from '@/types/socket';

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
    
    // Using Function constructor to create a dynamic function that can accept any parameters
    // This approach is needed to work around Socket.io's complex typing requirements
    // We can't use TypeScript's spread operator directly due to type issues
    const handler = ((data: any) => {
      callbackRef.current(data);
    }) as any;
    
    // Add the event listener to the socket
    socket.on(eventName, handler);
    
    // Clean up the event listener when unmounting
    return () => {
      socket.off(eventName, handler);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, eventName, ...deps]);
}

export default useSocketEvent;