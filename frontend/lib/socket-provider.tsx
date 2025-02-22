import * as React from 'react';
import type { ReactNode } from 'react';

import { toast } from 'sonner';

import type { Socket } from '@/types/socket';

import { DEFAULT_OPTIONS, MAX_RECONNECT_ATTEMPTS, initSocket } from './socket';

interface SocketContextValue {
    socket: Socket | null;
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
}

const SocketContext = React.createContext<SocketContextValue | null>(null);

interface SocketProviderProps {
    children: ReactNode;
}

/**
 * Socket provider component
 */
export function SocketProvider({ children }: SocketProviderProps) {
    const [isConnected, setIsConnected] = React.useState(false);
    const [isConnecting, setIsConnecting] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const socketRef = React.useRef<Socket | null>(null);
    const reconnectAttemptsRef = React.useRef(0);

    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        // Initialize socket if not already done
        if (!socketRef.current) {
            try {
                const socket = initSocket(DEFAULT_OPTIONS);
                socketRef.current = socket;

                // Manager-level error handling
                socket.io.on('error', (error) => {
                    console.error('Socket.IO manager error:', error);
                    toast.error('Connection error occurred');
                });

                // Connection lifecycle events
                socket.io.on('reconnect_attempt', (attempt) => {
                    console.info(`Socket.IO reconnection attempt ${attempt}`);
                    if (attempt <= MAX_RECONNECT_ATTEMPTS) {
                        toast.info('Attempting to reconnect...');
                    }
                });

                socket.io.on('reconnect', (attempt) => {
                    console.info(`Socket.IO reconnected after ${attempt} attempts`);
                    toast.success('Reconnected to chat server');
                    reconnectAttemptsRef.current = 0;
                    setIsConnected(true);
                    setIsConnecting(false);
                    setError(null);
                });

                socket.on('connect_error', (error) => {
                    console.error('Socket.IO connection error:', error);
                    reconnectAttemptsRef.current++;
                    
                    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                        toast.error('Unable to connect to chat server. Please refresh the page.');
                        setError('Unable to connect to chat server');
                        setIsConnecting(false);
                        socket.close();
                        socketRef.current = null;
                        return;
                    }

                    setIsConnecting(true);
                    setError('Connection error. Retrying...');
                });

                socket.on('connect', () => {
                    console.info('Socket connected');
                    reconnectAttemptsRef.current = 0;
                    toast.success('Connected to chat server');
                    setIsConnected(true);
                    setIsConnecting(false);
                    setError(null);
                });

                socket.on('disconnect', (reason) => {
                    console.info('Socket disconnected:', reason);
                    setIsConnected(false);
                    
                    if (reason === 'io server disconnect' || reason === 'io client disconnect') {
                        toast.error('Disconnected from chat server');
                        setIsConnecting(false);
                        setError('Disconnected from chat server');
                        socket.close();
                        socketRef.current = null;
                    } else {
                        setIsConnecting(true);
                        setError('Connection lost. Reconnecting...');
                    }
                });

                // Debug logging in development
                if (process.env.NODE_ENV !== 'production') {
                    socket.onAny((event, ...args) => {
                        console.debug('Socket.IO event:', event, args);
                    });
                }
            } catch (error) {
                console.error('Failed to initialize socket:', error);
                toast.error('Failed to initialize chat connection');
                setError('Failed to initialize chat connection');
                setIsConnecting(false);
            }
        }

        // Return cleanup function
        return () => {
            const socket = socketRef.current;
            if (socket) {
                socket.removeAllListeners();
                socket.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    return (
        <SocketContext.Provider value={{
            socket: socketRef.current,
            isConnected,
            isConnecting,
            error
        }}>
            {children}
        </SocketContext.Provider>
    );
}

/**
 * Hook to access socket context
 */
export function useSocket(): SocketContextValue {
    const context = React.useContext(SocketContext);
    
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    
    return context;
} 