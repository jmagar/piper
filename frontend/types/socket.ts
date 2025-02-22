import type { ExtendedChatMessage } from './chat';
import type { Socket as SocketIOSocket } from 'socket.io-client';

/**
 * Re-export Socket type from socket.io-client
 */
export type Socket = SocketIOSocket<ServerToClientEvents, ClientToServerEvents>;

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
    'message:new': (message: ExtendedChatMessage) => void;
    'message:update': (message: ExtendedChatMessage) => void;
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