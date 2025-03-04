/**
 * Socket Hook - Main Hook
 * 
 * Provides access to the socket instance and related state from any component.
 */

import { useContext } from 'react';
import { SocketContext } from '../providers/socket-provider';
import { SocketContextValue } from '../core/types';

/**
 * Hook to access the socket instance and connection state
 * 
 * @returns Socket context value containing socket instance and connection state
 * @throws Error if used outside of a SocketProvider
 */
export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  
  return context;
} 