import type { Server as HTTPServer } from 'http';

import type { PrismaClient } from '@prisma/client';
import debug from 'debug';
import type { Socket } from 'socket.io';
import { Server as SocketIOServer } from 'socket.io';

import { ChatLangChainService } from './services/chat/chat-langchain.service.mjs';
import { ChatService } from './services/chat/chat.service.js';

const log = debug('mcp:websocket');
const error = debug('mcp:websocket:error');

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
    type?: 'text' | 'code' | 'system' | 'file-list';
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

  // Initialize both services
  const legacyService = new ChatService(prisma);
  const langchainService = new ChatLangChainService(prisma);

  // Log all socket.io events in development
  if (process.env['NODE_ENV'] !== 'production') {
    io.engine.on('connection_error', (err) => {
      error('Socket.IO connection error: %s', err.message);
    });
  }

  io.on('connection', async (socket: Socket) => {
    log('Client connected: %s', socket.id);

    // Get user info from auth data
    const auth = socket.handshake.auth;
    const user = {
      userId: auth['userId'] || 'anonymous',
      username: auth['username'] || 'Anonymous'
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
        // Process message through LangChain service first, fallback to legacy
        let response;
        try {
          response = await langchainService.processMessage(
            message.content,
            user.userId,
            message.conversationId
          );
          log('Message processed by LangChain service');
        } catch (err) {
          error('LangChain service failed, falling back to legacy: %s', err instanceof Error ? err.message : String(err));
          response = await legacyService.processMessage(message.content, user.userId);
          log('Message processed by legacy service');
        }
        
        // Send acknowledgment for the user message
        callback({
          message: {
            ...message,
            status: 'sent',
            conversationId: response.conversationId // Update with the actual conversation ID
          }
        });

        // Convert metadata to expected format
        const metadata = response.metadata as Record<string, unknown> | undefined;

        // Broadcast the assistant's response
        const assistantMessage: ChatMessage = {
          id: response.id,
          content: response.content,
          role: 'assistant',
          userId: response.userId,
          username: response.username,
          conversationId: response.conversationId,
          parentId: response.parentId,
          metadata: {
            type: response.type,
            ...metadata
          },
          createdAt: response.createdAt.toISOString(),
          updatedAt: (response.updatedAt || response.createdAt).toISOString(),
          status: 'sent'
        };
        io.emit('message:new', assistantMessage);
      } catch (err) {
        error('Error handling message:sent: %s', err instanceof Error ? err.message : String(err));
        callback({
          error: 'Failed to process message. Please try again.'
        });
      }
    });

    socket.on('message:updated', async (message: ChatMessage) => {
      try {
        io.emit('message:update', message);
      } catch (err) {
        error('Error handling message:updated: %s', err instanceof Error ? err.message : String(err));
      }
    });

    socket.on('user:typing', () => {
      socket.broadcast.emit('user:typing', user);
    });

    socket.on('user:stop_typing', () => {
      socket.broadcast.emit('user:stop_typing', user);
    });

    socket.on('disconnect', () => {
      log('Client disconnected: %s', socket.id);
    });
  });

  return io;
}
