/**
 * Socket Types
 * 
 * Core type definitions for Socket.IO implementation.
 */

import { Socket as IOSocket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  ConnectionState
} from './events';

// Re-export ConnectionState to avoid circular dependencies
export type { ConnectionState };

/**
 * Socket type with properly typed events
 */
export type Socket = IOSocket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Socket context value
 */
export interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | string | null;
  connectionState: ConnectionState;
  reconnect: () => void;
  disconnect: () => void;
}
