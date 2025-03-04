import { useEffect, useState } from 'react';
import { useSocket } from '@/lib/socket/hooks/use-socket';

export interface TypingUser {
  userId: string;
  username: string;
  timestamp: Date;
}

/**
 * Hook to track users who are typing in a conversation
 * @param conversationId Optional conversation ID to filter typing events
 * @param timeout Time in ms after which a user is considered to have stopped typing (default: 3000ms)
 * @returns Array of users who are currently typing
 */
export function useTypingIndicator(conversationId?: string, timeout: number = 3000) {
  const { socket, isConnected } = useSocket();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    // Handler for typing started events
    const handleTypingStarted = (data: any) => {
      // Skip if no data
      if (!data) return;
      
      // Skip if not for this conversation
      if (conversationId && data.conversationId !== conversationId) return;
      
      const { userId, username } = data;
      
      // Skip if missing user info
      if (!userId) return;
      
      // Update typing users state
      setTypingUsers(prev => {
        // Check if user is already in the list
        const exists = prev.some(user => user.userId === userId);
        if (exists) {
          // Update timestamp
          return prev.map(user => 
            user.userId === userId 
              ? { ...user, timestamp: new Date() } 
              : user
          );
        } else {
          // Add new user
          return [...prev, {
            userId,
            username: username || 'User',
            timestamp: new Date()
          }];
        }
      });
    };
    
    // Handler for typing stopped events
    const handleTypingStopped = (data: any) => {
      // Skip if no data
      if (!data) return;
      
      // Skip if not for this conversation
      if (conversationId && data.conversationId !== conversationId) return;
      
      const { userId } = data;
      
      // Skip if missing user ID
      if (!userId) return;
      
      // Remove user from typing list
      setTypingUsers(prev => prev.filter(user => user.userId !== userId));
    };
    
    // Subscribe to typing events
    socket.on('typing:started', handleTypingStarted);
    socket.on('typing:stopped', handleTypingStopped);
    
    // Clean up typing users periodically
    const cleanupInterval = setInterval(() => {
      const now = new Date();
      setTypingUsers(prev => 
        prev.filter(user => now.getTime() - user.timestamp.getTime() < timeout)
      );
    }, 1000);
    
    // Cleanup
    return () => {
      socket.off('typing:started', handleTypingStarted);
      socket.off('typing:stopped', handleTypingStopped);
      clearInterval(cleanupInterval);
    };
  }, [socket, isConnected, conversationId, timeout]);
  
  return typingUsers;
} 