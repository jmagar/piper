import { useEffect, useState, useCallback } from 'react';

import { Socket } from 'socket.io-client';
import { toast } from 'sonner';

import { useSocket } from '@/lib/socket';

export function useChatSocket() {
    const socket = useSocket();
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const connect = useCallback(() => {
        if (!socket) {
            setError('Chat connection not available');
            toast.error('Chat connection not available');
            return;
        }

        if (!socket.connected) {
            setIsConnecting(true);
            setError(null);
            socket.connect();
        }
    }, [socket]);

    useEffect(() => {
        if (!socket) {
            setIsConnecting(false);
            setIsConnected(false);
            setError('Initializing chat connection...');
            return;
        }

        const handleConnect = () => {
            console.log('Chat socket connected');
            setIsConnected(true);
            setIsConnecting(false);
            setError(null);
        };

        const handleDisconnect = (reason: string) => {
            console.log('Chat socket disconnected:', reason);
            setIsConnected(false);
            
            if (reason === 'io server disconnect' || reason === 'io client disconnect') {
                setError('Disconnected from chat server');
                setIsConnecting(false);
            } else {
                // For other disconnect reasons, we'll let the socket's auto-reconnect handle it
                setIsConnecting(true);
                setError('Connection lost. Reconnecting...');
            }
        };

        const handleConnectError = (error: Error) => {
            console.error('Chat socket connection error:', error);
            setIsConnecting(false);
            setIsConnected(false);
            setError('Failed to connect to chat server');
        };

        const handleError = (error: Error) => {
            console.error('Chat socket error:', error);
            setError('Chat server error occurred');
        };

        // Set up event listeners
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);
        socket.on('error', handleError);

        // Set initial connection state
        setIsConnected(socket.connected);
        setIsConnecting(!socket.connected);

        // Clean up event listeners
        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('connect_error', handleConnectError);
            socket.off('error', handleError);
        };
    }, [socket]);

    return {
        socket,
        isConnected,
        isConnecting,
        error,
        connect
    };
}