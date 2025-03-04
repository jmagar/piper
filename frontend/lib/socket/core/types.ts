/**
 * Socket Types
 * 
 * Core type definitions for Socket.IO implementation.
 */

import { Socket as IOSocket } from 'socket.io-client';
import { ConnectionState } from './events';
import type {
  ServerToClientEvents,
  ClientToServerEvents
} from './events';

// Re-export ConnectionState so connection.ts can import it from here
export { ConnectionState };

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