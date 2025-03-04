import * as React from 'react';
import { useSocket } from '@/lib/socket/hooks';

interface UseTypingOptions {
  /**
   * Debounce time in milliseconds
   */
  debounceTime?: number;
}

/**
 * A hook that handles typing indicator functionality
 * @param options - Configuration options
 * @returns Object containing typing state and handlers
 */
export function useTyping({ debounceTime = 1000 }: UseTypingOptions = {}) {
  const { socket, isConnected } = useSocket();
  const [isTyping, setIsTyping] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>(null!);

  const startTyping = React.useCallback(() => {
    if (!isConnected || !socket) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('user:typing');
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit('user:stop_typing');
    }, debounceTime);
  }, [isConnected, socket, isTyping, debounceTime]);

  const stopTyping = React.useCallback(() => {
    if (!isConnected || !socket) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (isTyping) {
      setIsTyping(false);
      socket.emit('user:stop_typing');
    }
  }, [isConnected, socket, isTyping]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isTyping,
    startTyping,
    stopTyping
  };
} 