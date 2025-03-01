import * as React from 'react';
import { toast } from 'sonner';

import { DEFAULT_OPTIONS, MAX_RECONNECT_ATTEMPTS, initSocket } from './socket';

// Create context
const SocketContext = React.createContext(null);

/**
 * Socket provider component that manages socket connection lifecycle
 */
export function SocketProvider({ children }) {
    const [isConnected, setIsConnected] = React.useState(false);
    const [isConnecting, setIsConnecting] = React.useState(true);
    const [error, setError] = React.useState(null);
    const socketRef = React.useRef(null);
    const reconnectAttemptsRef = React.useRef(0);

    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        // Initialize socket if not already done
        if (!socketRef.current) {
            try {
                const socket = initSocket(DEFAULT_OPTIONS);
                socketRef.current = socket;

                // Manager-level error handling
                socket.io.on('error', (_err) => {
                    toast.error('Connection error occurred');
                });

                // Connection lifecycle events
                socket.io.on('reconnect_attempt', (attempt) => {
                    if (attempt <= MAX_RECONNECT_ATTEMPTS) {
                        toast.info('Attempting to reconnect...');
                    }
                });

                socket.io.on('reconnect', () => {
                    toast.success('Reconnected to chat server');
                    reconnectAttemptsRef.current = 0;
                    setIsConnected(true);
                    setIsConnecting(false);
                    setError(null);
                });

                socket.on('connect_error', () => {
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
                    reconnectAttemptsRef.current = 0;
                    toast.success('Connected to chat server');
                    setIsConnected(true);
                    setIsConnecting(false);
                    setError(null);
                });

                socket.on('disconnect', (reason) => {
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
            } catch (_err) {
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
 * @returns Socket context value with the socket instance and connection state
 */
export function useSocket() {
    const context = React.useContext(SocketContext);
    
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    
    return context;
}