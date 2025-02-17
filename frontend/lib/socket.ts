import { io, Socket } from 'socket.io-client';
import { useEffect, useRef } from 'react';

let socket: Socket | null = null;

export function initSocket() {
    if (!socket) {
        socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100', {
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity
        });
    }
    return socket;
}

export function useSocket() {
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!socketRef.current) {
            socketRef.current = initSocket();
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    return socketRef.current;
} 