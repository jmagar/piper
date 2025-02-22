import { io } from 'socket.io-client';

import type { Socket, SocketOptions } from '@/types/socket';

/**
 * Maximum number of reconnection attempts
 */
export const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Default socket options
 */
export const DEFAULT_OPTIONS: SocketOptions = {
    userId: 'test-user-1',
    username: 'Test User'
} as const;

/**
 * Get the API URL from environment or use default
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100';

/**
 * Initialize and configure the socket connection
 */
export function initSocket(options: SocketOptions = DEFAULT_OPTIONS): Socket {
    return io(API_URL, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true,
        withCredentials: false,
        auth: options
    });
}

export { SocketProvider, useSocket } from './socket-provider';
