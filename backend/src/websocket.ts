import type { Server as HTTPServer } from 'http';
import type { Socket } from 'socket.io';
import { Server as SocketIOServer } from 'socket.io';
import type { PrismaClient } from '@prisma/client';
import { ChatService } from './services/chat/chat.service.js';
import type { ChatMessage as ApiChatMessage } from './generated/model/models.js';

interface User {
    userId: string;
    username: string;
}

interface ChatMessage {
    id: string;
    content: string;
    role: 'user' | 'assistant' | 'system';
    conversationId?: string;
    userId?: string;
    username?: string;
    parentId?: string;
    threadSummary?: string;
    metadata?: {
        username?: string;
        type?: 'text' | 'code' | 'system';
        [key: string]: unknown;
    };
    createdAt: string;
    updatedAt: string;
    status: 'sending' | 'sent' | 'error';
}

interface ServerToClientEvents {
    'message:new': (message: ChatMessage) => void;
    'message:update': (message: ChatMessage) => void;
    'user:typing': (user: User) => void;
    'user:stop_typing': (user: User) => void;
}

interface ClientToServerEvents {
    'message:sent': (message: ChatMessage, callback: (response: { error?: string; message?: ChatMessage }) => void) => void;
    'message:updated': (message: ChatMessage) => void;
    'user:typing': () => void;
    'user:stop_typing': () => void;
}

interface InterServerEvents {
    ping: () => void;
}

interface SocketData {
    user: User;
}

const corsOptions = {
    origin: '*',  // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

function transformApiMessage(message: ApiChatMessage): ChatMessage {
    return {
        id: message.id || Date.now().toString(),
        content: message.content || '',
        role: (message.role as unknown) as ('user' | 'assistant' | 'system'),
        conversationId: message.conversationId,
        userId: message.userId,
        parentId: message.parentId,
        metadata: message.metadata || {},
        createdAt: typeof message.createdAt === 'string' ? message.createdAt : new Date().toISOString(),
        updatedAt: typeof message.updatedAt === 'string' ? message.updatedAt : new Date().toISOString(),
        status: message.metadata?.status as 'sending' | 'sent' | 'error' || 'sent'
    };
}

export function initWebSocket(server: HTTPServer, prisma: PrismaClient) {
    const io = new SocketIOServer<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
    >(server, {
        cors: corsOptions,
        allowEIO3: true,
        transports: ['polling', 'websocket'],
        pingTimeout: 45000,
        pingInterval: 10000,
        connectTimeout: 45000,
        path: '/socket.io'
    });

    const chatService = new ChatService(prisma);

    // Log all socket.io events in development
    if (process.env.NODE_ENV !== 'production') {
        io.engine.on('connection_error', (err) => {
            console.log('Socket.IO connection error:', err);
        });

        io.engine.on('headers', (headers, req) => {
            console.log('Socket.IO headers:', headers);
        });
    }

    io.on('connection', async (socket: Socket) => {
        console.log('Client connected:', socket.id);

        // Get user info from auth data
        const user = {
            userId: socket.handshake.auth.userId || 'anonymous',
            username: socket.handshake.auth.username || 'Anonymous'
        };

        // Store user data in socket
        socket.data.user = user;

        // Join user's room
        socket.join(user.userId);

        // Send welcome message
        socket.emit('message:new', {
            id: Date.now().toString(),
            content: 'Connected to chat server',
            role: 'system',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {
                type: 'system'
            },
            status: 'sent'
        });

        socket.on('message:sent', async (message: ChatMessage, callback) => {
            try {
                // Process message through chat service
                const response = await chatService.processMessage(message.content, user.userId);
                
                // Send acknowledgment for the user message
                callback({
                    message: {
                        ...message,
                        status: 'sent'
                    }
                });

                // Broadcast the assistant's response
                const assistantMessage: ChatMessage = {
                    id: response.id,
                    content: response.content,
                    role: 'assistant',
                    userId: response.userId,
                    username: response.username,
                    conversationId: response.conversationId,
                    parentId: response.parentId,
                    metadata: response.metadata,
                    createdAt: response.createdAt.toISOString(),
                    updatedAt: (response.updatedAt || response.createdAt).toISOString(),
                    status: 'sent'
                };
                io.emit('message:new', assistantMessage);
            } catch (error) {
                console.error('Error handling message:sent:', error);
                // Send error message back to the client
                callback({
                    error: 'Failed to process message. Please try again.'
                });
            }
        });

        socket.on('message:updated', async (message: ChatMessage) => {
            try {
                // Broadcast to all connected clients
                io.emit('message:update', message);
            } catch (error) {
                console.error('Error handling message:updated:', error);
            }
        });

        socket.on('user:typing', () => {
            socket.broadcast.emit('user:typing', user);
        });

        socket.on('user:stop_typing', () => {
            socket.broadcast.emit('user:stop_typing', user);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    return io;
}
