import { io } from 'socket.io-client';

import { getWebSocketUrl } from './env';
import type { Socket, SocketOptions } from '@/types/socket';

/**
 * Maximum number of reconnection attempts
 */
export const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Default socket options
 */
export const DEFAULT_OPTIONS: SocketOptions = {
    userId: 'test-user-1',
    username: 'Test User'
} as const;

/**
 * Initialize and configure the socket connection
 */
export function initSocket(options: SocketOptions = DEFAULT_OPTIONS): Socket {
    // Get the WebSocket URL from environment variables
    const wsUrl = getWebSocketUrl();
    console.log('Connecting to WebSocket server at:', wsUrl);
    return io(wsUrl, {
        path: '/socket.io',
        transports: ['polling', 'websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: 500,
        reconnectionDelayMax: 2000,
        timeout: 45000,
        forceNew: true,
        withCredentials: false,
        auth: options
    });
}

export { SocketProvider, useSocket } from './socket-provider';