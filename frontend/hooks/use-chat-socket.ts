import * as React from 'react';

import { useSocket } from '@/lib/socket';
import type { ExtendedChatMessage } from '@/types/chat';

export function useChatSocket() {
    const { socket, isConnected } = useSocket();

    const connect = React.useCallback(() => {
        socket?.connect();
    }, [socket]);

    const onNewMessage = React.useCallback((callback: (message: ExtendedChatMessage) => void) => {
        socket?.on('message:new', callback);
        return () => socket?.off('message:new', callback);
    }, [socket]);

    const onMessageUpdate = React.useCallback((callback: (message: ExtendedChatMessage) => void) => {
        socket?.on('message:update', callback);
        return () => socket?.off('message:update', callback);
    }, [socket]);

    const onUserTyping = React.useCallback((callback: (user: { userId: string; username: string }) => void) => {
        socket?.on('user:typing', callback);
        return () => socket?.off('user:typing', callback);
    }, [socket]);

    const onUserStopTyping = React.useCallback((callback: (user: { userId: string; username: string }) => void) => {
        socket?.on('user:stop_typing', callback);
        return () => socket?.off('user:stop_typing', callback);
    }, [socket]);

    return {
        socket,
        isConnected,
        connect,
        onNewMessage,
        onMessageUpdate,
        onUserTyping,
        onUserStopTyping
    };
}