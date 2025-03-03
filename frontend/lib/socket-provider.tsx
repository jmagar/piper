"use client";

import * as React from 'react';
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { io } from 'socket.io-client';
import { EventEmitter } from 'events';
import { toast } from 'sonner';

import { ConnectionState } from '@/types/socket';
import type { 
    Socket, 
    SocketOptions, 
    SocketConnectionConfig, 
    StreamEvent,
    SocketAuthOptions
} from '@/types/socket';

/**
 * Enhanced Socket Context Value with LangGraph-style streaming
 */
interface SocketContextValue {
    socket: Socket | null;
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
    connectionState: ConnectionState;
    eventEmitter: EventEmitter;
    reconnect: () => void;
    disconnect: () => void;
}

/**
 * Socket Provider Props
 */
interface SocketProviderProps {
    children: ReactNode;
    config?: SocketConnectionConfig;
}

// Create a stable event emitter that persists across renders
const globalEventEmitter = new EventEmitter();

// Create context with default values
const SocketContext = createContext<SocketContextValue>({
    socket: null,
    isConnected: false,
    isConnecting: false,
    error: null,
    connectionState: ConnectionState.DISCONNECTED,
    eventEmitter: globalEventEmitter,
    reconnect: () => {},
    disconnect: () => {}
});

/**
 * Socket Provider - Implements LangGraph-style streaming
 */
export function SocketProvider({ children, config }: SocketProviderProps) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
    
    // Use a stable ref for socket configuration
    const socketConfigRef = useRef<SocketConnectionConfig>({
        url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 
             (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4100'),
        path: '/socket.io',
        autoConnect: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        reconnection: true,
        showToasts: true,
        ...(config || {})
    });
    
    const socketRef = useRef<Socket | null>(null);
    const reconnectAttemptsRef = useRef(0);
    
    // Initialize socket connection only once on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        console.log('Initializing socket connection');
        initSocketConnection();
        
        return () => {
            // Clean up socket connection on unmount
            if (socketRef.current) {
                console.log('Disconnecting socket on unmount');
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
            }
        };
    }, []); // Empty dependency array ensures this only runs once on mount
    
    // Initialize socket connection
    const initSocketConnection = () => {
        // Don't attempt to connect if already connecting or connected
        if (isConnecting || socketRef.current) return;
        
        const { url, path, autoConnect, reconnectionAttempts, 
                reconnectionDelay, reconnectionDelayMax, timeout } = socketConfigRef.current;
        
        console.log(`Connecting to WebSocket server at: ${url}`);
        setConnectionState(ConnectionState.CONNECTING);
        setIsConnecting(true);
        
        try {
            // Create socket instance
            const socketInstance = io(url, {
                path,
                autoConnect,
                reconnectionAttempts,
                reconnectionDelay,
                reconnectionDelayMax,
                timeout,
                transports: ['websocket', 'polling']
            });
            
            // Set up event handlers
            socketInstance.on('connect', () => {
                console.log(`Socket connected, initializing handshake... ${socketInstance.id}`);
                setIsConnected(true);
                setIsConnecting(false);
                setConnectionState(ConnectionState.CONNECTED);
                reconnectAttemptsRef.current = 0;
                
                // Perform authentication
                const userId = typeof window !== 'undefined' 
                    ? (window.localStorage.getItem('userId') || 'admin')
                    : 'admin';
                    
                console.log(`Emitting auth event with userId: ${userId}`);
                
                socketInstance.emit('auth', { userId } as SocketAuthOptions, (response) => {
                    console.log('Auth response received:', response);
                    
                    if (response.success) {
                        console.log('Handshake successful, setting up event handlers...');
                        setupLangGraphEventHandlers(socketInstance);
                        
                        if (socketConfigRef.current.showToasts) {
                            toast.success('Connected to server');
                        }
                    } else {
                        console.error('Authentication failed:', response.error);
                        setError(response.error || 'Authentication failed');
                        setConnectionState(ConnectionState.FAILED);
                        
                        if (socketConfigRef.current.showToasts) {
                            toast.error(`Connection failed: ${response.error || 'Authentication error'}`);
                        }
                    }
                });
            });
            
            socketInstance.on('connect_error', (err) => {
                console.error('Socket connection error:', err);
                setIsConnected(false);
                setIsConnecting(false);
                setConnectionState(ConnectionState.FAILED);
                setError(err.message);
                
                if (socketConfigRef.current.showToasts) {
                    toast.error(`Connection error: ${err.message}`);
                }
            });
            
            socketInstance.on('disconnect', (reason) => {
                console.log(`Socket disconnected: ${reason}`);
                setIsConnected(false);
                setConnectionState(ConnectionState.DISCONNECTED);
                
                if (reason === 'io server disconnect') {
                    // Server initiated disconnect, don't reconnect automatically
                    if (socketConfigRef.current.showToasts) {
                        toast.error('Disconnected by server');
                    }
                } else {
                    setConnectionState(ConnectionState.RECONNECTING);
                    
                    if (socketConfigRef.current.showToasts) {
                        toast.warning('Connection lost, attempting to reconnect...');
                    }
                }
            });
            
            socketInstance.on('reconnect', (attemptNumber) => {
                console.log(`Socket reconnected after ${attemptNumber} attempts`);
                setIsConnected(true);
                setConnectionState(ConnectionState.CONNECTED);
                
                if (socketConfigRef.current.showToasts) {
                    toast.success('Reconnected to server');
                }
            });
            
            socketInstance.on('reconnect_attempt', (attemptNumber) => {
                console.log(`Socket reconnect attempt ${attemptNumber}`);
                setConnectionState(ConnectionState.RECONNECTING);
                reconnectAttemptsRef.current = attemptNumber;
            });
            
            socketInstance.on('reconnect_error', (err) => {
                console.error('Socket reconnection error:', err);
                setError(err.message);
                
                if (reconnectAttemptsRef.current >= (socketConfigRef.current.reconnectionAttempts || 5)) {
                    setConnectionState(ConnectionState.FAILED);
                    
                    if (socketConfigRef.current.showToasts) {
                        toast.error('Failed to reconnect after multiple attempts');
                    }
                }
            });
            
            socketInstance.on('reconnect_failed', () => {
                console.error('Socket reconnection failed after max attempts');
                setConnectionState(ConnectionState.FAILED);
                
                if (socketConfigRef.current.showToasts) {
                    toast.error('Reconnection failed');
                }
            });
            
            socketInstance.on('error', (err) => {
                console.error('Socket error:', err);
                setError(typeof err === 'string' ? err : err.message || 'Unknown socket error');
                
                if (socketConfigRef.current.showToasts) {
                    toast.error(`Socket error: ${typeof err === 'string' ? err : err.message || 'Unknown error'}`);
                }
            });
            
            // Store socket instance in ref and state
            socketRef.current = socketInstance;
            setSocket(socketInstance);
            
        } catch (err) {
            console.error('Error initializing socket:', err);
            setIsConnecting(false);
            setConnectionState(ConnectionState.FAILED);
            setError(err instanceof Error ? err.message : 'Unknown error initializing socket');
            
            if (socketConfigRef.current.showToasts) {
                toast.error(`Failed to initialize socket: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        }
    };
    
    /**
     * Set up LangGraph-style event handlers
     */
    const setupLangGraphEventHandlers = (socketInstance: Socket) => {
        console.log('Setting up LangGraph event handlers');
        
        // Register handler for the unified stream:event
        socketInstance.on('stream:event', (event: StreamEvent) => {
            console.log(`[LANGGRAPH] Received event: ${event.event}`, {
                name: event.name,
                runId: event.run_id,
                tags: event.tags
            });
            
            // Forward all events to the event emitter
            globalEventEmitter.emit(event.event, event);
            
            // Also emit a generic 'stream:event' for components that want to handle all events
            globalEventEmitter.emit('stream:event', event);
            
            // Special handling for specific event types
            switch (event.event) {
                case 'on_chat_model_start':
                    // Model has started generating
                    console.log(`[LANGGRAPH] Model started: ${event.name}`);
                    break;
                    
                case 'on_chat_model_stream':
                    // Token streaming
                    const token = event.data.chunk.content;
                    const messageId = event.data.chunk.id;
                    console.log(`[LANGGRAPH] Token received for ${messageId}: ${token.length} chars`);
                    
                    // Forward to legacy message:chunk for backward compatibility
                    socketInstance.emit('message:chunk', {
                        messageId,
                        chunk: token,
                        timestamp: new Date().toISOString()
                    });
                    break;
                    
                case 'on_chat_model_end':
                    // Model generation complete
                    console.log(`[LANGGRAPH] Model completed: ${event.name}`);
                    
                    // Forward to legacy message:complete for backward compatibility
                    if (event.metadata?.messageId) {
                        socketInstance.emit('message:complete', {
                            messageId: event.metadata.messageId,
                            timestamp: new Date().toISOString()
                        });
                    }
                    break;
                    
                case 'on_chain_error':
                    // Error in processing
                    console.error(`[LANGGRAPH] Chain error: ${event.name}`, event.data.error);
                    
                    // Forward to legacy message:error for backward compatibility
                    if (event.metadata?.messageId) {
                        socketInstance.emit('message:error', {
                            messageId: event.metadata.messageId,
                            message: event.data.error.message || 'An error occurred'
                        });
                    }
                    break;
            }
        });
        
        // For compatibility, still register legacy event handlers
        // but these now just forward to our LangGraph event system
        
        socketInstance.on('message:chunk', (data) => {
            // Create synthetic LangGraph event for compatibility
            const langGraphEvent: StreamEvent = {
                event: 'on_chat_model_stream',
                name: 'LegacyStreamHandler',
                run_id: data.messageId,
                metadata: {
                    messageId: data.messageId,
                    timestamp: data.timestamp,
                    chunkIndex: data.chunkIndex
                },
                data: {
                    chunk: {
                        content: data.chunk,
                        id: data.messageId
                    }
                }
            };
            
            // Emit the synthetic event through our event system
            globalEventEmitter.emit('on_chat_model_stream', langGraphEvent);
            globalEventEmitter.emit('stream:event', langGraphEvent);
        });
        
        socketInstance.on('message:complete', (data) => {
            // Create synthetic LangGraph event for compatibility
            const langGraphEvent: StreamEvent = {
                event: 'on_chat_model_end',
                name: 'LegacyStreamHandler',
                run_id: data.messageId,
                metadata: {
                    messageId: data.messageId,
                    timestamp: data.timestamp
                },
                data: {
                    output: {
                        id: data.messageId,
                        complete: true
                    }
                }
            };
            
            // Emit the synthetic event through our event system
            globalEventEmitter.emit('on_chat_model_end', langGraphEvent);
            globalEventEmitter.emit('stream:event', langGraphEvent);
        });
        
        socketInstance.on('message:error', (data) => {
            // Create synthetic LangGraph event for compatibility
            const langGraphEvent: StreamEvent = {
                event: 'on_chain_error',
                name: 'LegacyStreamHandler',
                run_id: data.messageId,
                metadata: {
                    messageId: data.messageId
                },
                data: {
                    error: {
                        message: data.message
                    }
                }
            };
            
            // Emit the synthetic event through our event system
            globalEventEmitter.emit('on_chain_error', langGraphEvent);
            globalEventEmitter.emit('stream:event', langGraphEvent);
        });
        
        // Log registered handlers
        if (socketInstance) {
            const socketAny = socketInstance as any;
            const registeredHandlers = Object.keys(socketAny._callbacks || {})
                .filter(key => key.startsWith('$'))
                .map(key => key.substring(1));
            
            console.log('Registered handlers after setup:', registeredHandlers);
        }
    };
    
    // Manually reconnect socket
    const reconnect = () => {
        if (socketRef.current) {
            console.log('Manually reconnecting socket...');
            socketRef.current.connect();
        } else {
            // Re-initialize if socket instance is lost
            initSocketConnection();
        }
    };
    
    // Manually disconnect socket
    const disconnect = () => {
        if (socketRef.current) {
            console.log('Manually disconnecting socket...');
            socketRef.current.disconnect();
        }
    };
    
    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = React.useMemo(() => ({
        socket,
        isConnected,
        isConnecting,
        error,
        connectionState,
        eventEmitter: globalEventEmitter,
        reconnect,
        disconnect
    }), [socket, isConnected, isConnecting, error, connectionState]);
    
    return (
        <SocketContext.Provider value={contextValue}>
            {children}
        </SocketContext.Provider>
    );
}

/**
 * Hook to access socket context
 */
export function useSocket(): SocketContextValue {
    const context = useContext(SocketContext);
    
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    
    return context;
}

/**
 * Hook to subscribe to LangGraph-style stream events
 */
export function useStreamEvent<T = any>(
    eventType: string,
    callback: (event: StreamEvent & { data: T }) => void,
    deps: React.DependencyList = []
) {
    const { eventEmitter } = useSocket();
    
    // Keep the callback in a ref to prevent unnecessary effect triggers
    const callbackRef = React.useRef(callback);
    
    // Update the callback ref when callback changes
    React.useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);
    
    React.useEffect(() => {
        // Wrapper function that uses the current callback ref value
        const handler = (event: StreamEvent) => {
            // This ensures we're always using the latest callback function
            callbackRef.current(event as StreamEvent & { data: T });
        };
        
        // Add event listener
        eventEmitter.on(eventType, handler);
        
        // Clean up event listener
        return () => {
            eventEmitter.off(eventType, handler);
        };
    }, [eventEmitter, eventType, ...deps]); // Only re-register when event emitter, type, or deps change
}

/**
 * Hook for subscribing to all stream events in a single handler
 */
export function useAllStreamEvents(
    callback: (event: StreamEvent) => void,
    deps: React.DependencyList = []
) {
    // We're using the useStreamEvent hook which already handles
    // the callback reference pattern to prevent unnecessary effect triggers
    useStreamEvent('stream:event', callback, deps);
}

/**
 * Hook for subscribing to chat model token streams
 */
export function useChatModelStream(
    callback: (chunk: string, messageId: string, metadata: Record<string, any>) => void,
    deps: React.DependencyList = []
) {
    // Keep the callback in a ref to prevent unnecessary effect triggers
    const callbackRef = React.useRef(callback);
    
    // Update the callback ref when callback changes
    React.useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);
    
    useStreamEvent<{ chunk: { content: string, id: string } }>(
        'on_chat_model_stream',
        (event) => {
            // Use the current callback ref value
            callbackRef.current(
                event.data.chunk.content,
                event.data.chunk.id,
                event.metadata
            );
        },
        deps
    );
}

/**
 * Hook for subscribing to chat model completion events
 */
export function useChatModelComplete(
    callback: (messageId: string, metadata: Record<string, any>) => void,
    deps: React.DependencyList = []
) {
    // Keep the callback in a ref to prevent unnecessary effect triggers
    const callbackRef = React.useRef(callback);
    
    // Update the callback ref when callback changes
    React.useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);
    
    useStreamEvent(
        'on_chat_model_end',
        (event) => {
            // Use the current callback ref value
            callbackRef.current(
                event.metadata.messageId || event.run_id,
                event.metadata
            );
        },
        deps
    );
}

/**
 * Hook for subscribing to chat model error events
 */
export function useChatModelError(
    callback: (error: any, messageId: string, metadata: Record<string, any>) => void,
    deps: React.DependencyList = []
) {
    // Keep the callback in a ref to prevent unnecessary effect triggers
    const callbackRef = React.useRef(callback);
    
    // Update the callback ref when callback changes
    React.useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);
    
    useStreamEvent<{ error: any }>(
        'on_chain_error',
        (event) => {
            // Use the current callback ref value
            callbackRef.current(
                event.data.error,
                event.metadata.messageId || event.run_id,
                event.metadata
            );
        },
        deps
    );
}