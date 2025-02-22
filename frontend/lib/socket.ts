import { io } from 'socket.io-client';

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
 * API URL is configured in next.config.js and available at build time
 */
export const API_URL = 'http://localhost:4100';

/**
 * Initialize and configure the socket connection
 */
export function initSocket(options: SocketOptions = DEFAULT_OPTIONS): Socket {
    return io(API_URL, {
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
