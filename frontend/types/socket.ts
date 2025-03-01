import type { ExtendedChatMessage } from './chat';
import type { Socket as SocketIOSocket } from 'socket.io-client';

/**
 * Connection states for the socket
 */
export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

/**
 * Socket connection status
 */
export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Socket connection options
 */
export interface SocketOptions {
    userId: string;
    username: string;
}

/**
 * Events sent from server to client
 */
export interface ServerToClientEvents {
    'message': (message: ExtendedChatMessage) => void; // Generic message event
    'message:new': (message: ExtendedChatMessage) => void;
    'message:update': (message: ExtendedChatMessage) => void;
    'message:chunk': (data: { messageId: string; chunk: string }) => void;
    'message:error': (data: { messageId: string; error: string }) => void;
    'message:complete': (data: { messageId: string; metadata?: Record<string, unknown> }) => void;
    'user:typing': (user: { userId: string; username: string }) => void;
    'user:stop_typing': (user: { userId: string; username: string }) => void;
}

/**
 * Events sent from client to server
 */
export interface ClientToServerEvents {
    'message:sent': (
        message: ExtendedChatMessage,
        callback: (response: { error?: string; message?: ExtendedChatMessage }) => void
    ) => void;
    'message:updated': (message: ExtendedChatMessage) => void;
    'user:typing': () => void;
    'user:stop_typing': () => void;
}

/**
 * Socket type with event interfaces
 */
export type Socket = SocketIOSocket<ServerToClientEvents, ClientToServerEvents>;

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData {
    userId: string;
    username: string;
}
