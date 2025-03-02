import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient, Prisma } from '@prisma/client';
import debug from 'debug';
import { ChatLangChainService } from './services/chat/chat-langchain.service.mjs';

const log = debug('socket:main');
const error = debug('socket:error');

/**
 * Initialize WebSocket server with Socket.IO
 * @param httpServer - HTTP server to attach Socket.IO to
 * @param prisma - Prisma client instance for database operations
 * @returns Socket.IO server instance
 */
export function initWebSocket(httpServer: HttpServer, prisma: PrismaClient): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Allow all origins in development
      methods: ['GET', 'POST'],
      credentials: false
    }
  });

  // Initialize the chat service
  const chatService = new ChatLangChainService(prisma);

  // Connection event
  io.on('connection', (socket) => {
    log('Client connected: %s', socket.id);
    
    // Log connection to database
    logSocketEvent(prisma, 'connection', socket.id, socket.handshake.query.userId as string);
    
    // Track connection time
    const connectionTime = Date.now();

    // Handle chat messages - LEGACY HANDLER
    socket.on('chat:message', async (data) => {
      log('Received message (legacy chat:message): %o', data);
      
      try {
        // Log message event to database
        await logSocketEvent(prisma, 'chat:message', socket.id, data.userId, data);
      } catch (err) {
        error('Failed to log socket message event: %s', err instanceof Error ? err.message : String(err));
        // Non-fatal, continue processing
      }
      
      // Broadcast message to all clients
      io.emit('chat:message', data);
    });

    // NEW HANDLER FOR message:sent EVENT
    socket.on('message:sent', async (data) => {
      console.log('Received message from client:', data);

      // Create a unique message ID for the response
      const responseId = `response-${Date.now()}`;
      
      try {
        // Get the LangChain service with Prisma client
        const chatLangChainService = new ChatLangChainService(prisma);
        
        // Extract needed data
        const userId = data.userId || data.user?.id || 'anonymous';
        const messageContent = data.content;
        const conversationId = data.conversationId;
        
        // Emit event to indicate the assistant is generating a response
        socket.emit('message:new', {
          id: responseId,
          content: '',
          role: 'assistant',
          type: 'text',
          status: 'streaming',
          createdAt: new Date().toISOString(),
          user: { id: 'system', name: 'Assistant' },
          metadata: {},
        });
        
        // Emit typing indicator
        socket.emit('user:typing', { userId: 'assistant', username: 'Assistant' });
        
        // Call the streaming message processor with the correct parameters
        await chatLangChainService.processStreamingMessage(
          messageContent,
          userId,
          {
            // Handle streaming chunks as they arrive
            onChunk: (chunk) => {
              socket.emit('message:chunk', {
                messageId: responseId,
                chunk,
                timestamp: new Date().toISOString(),
              });
            },
            
            // Handle processing completion
            onComplete: () => {
              socket.emit('message:complete', {
                messageId: responseId,
                timestamp: new Date().toISOString(),
              });
              socket.emit('user:stop_typing', { 
                userId: 'assistant', 
                username: 'Assistant' 
              });
            },
            
            // Handle errors during processing
            onError: (err) => {
              console.error('Error processing message:', err);
              socket.emit('message:error', {
                messageId: responseId,
                error: err.message || 'An error occurred while processing your message',
              });
              socket.emit('user:stop_typing', { 
                userId: 'assistant', 
                username: 'Assistant' 
              });
              
              // Send a user-friendly error message
              socket.emit('message:new', {
                id: `error-${Date.now()}`,
                content: "I'm sorry, but I encountered an error while processing your message. Some of my tools might be temporarily unavailable. Please try again in a moment.",
                role: 'assistant',
                type: 'text',
                status: 'sent',
                createdAt: new Date().toISOString(),
                user: { id: 'system', name: 'Assistant' },
                metadata: { error: 'processing_failed' },
              });
            }
          },
          conversationId
        );
      } catch (error) {
        console.error('Error processing message:', error);
        
        // Handle any errors that occurred in the handler
        socket.emit('message:error', {
          messageId: responseId,
          error: error instanceof Error ? error.message : 'An unknown error occurred',
        });
        socket.emit('user:stop_typing', { 
          userId: 'assistant', 
          username: 'Assistant' 
        });
        
        // Send a user-friendly error message even for handler errors
        socket.emit('message:new', {
          id: `error-${Date.now()}`,
          content: "I'm sorry, but I encountered a system error. My tools might be temporarily unavailable. Please try again later.",
          role: 'assistant',
          type: 'text',
          status: 'sent',
          createdAt: new Date().toISOString(),
          user: { id: 'system', name: 'Assistant' },
          metadata: { 
            error: 'system_error',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          },
        });
      }
    });

    // Handle typing indicators
    socket.on('chat:typing', async (data) => {
      log('Typing indicator: %o', data);
      
      try {
        // Log typing event (optional - can generate a lot of events)
        await logSocketEvent(prisma, 'chat:typing', socket.id, data.userId, data);
      } catch (err) {
        // Typing events are secondary, just log the error
        error('Failed to log typing event: %s', err instanceof Error ? err.message : String(err));
      }
      
      // Broadcast typing indicator to all clients except sender
      socket.broadcast.emit('chat:typing', data);
    });

    // Handle message reactions
    socket.on('chat:reaction', async (data) => {
      log('Message reaction: %o', data);
      
      try {
        // Log reaction event
        await logSocketEvent(prisma, 'chat:reaction', socket.id, data.userId, data);
      } catch (err) {
        error('Failed to log reaction event: %s', err instanceof Error ? err.message : String(err));
      }
      
      // Broadcast reaction to all clients
      io.emit('chat:reaction', data);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const duration = Date.now() - connectionTime;
      log('Client disconnected: %s (duration: %d ms)', socket.id, duration);
      
      // Log disconnection to database with duration
      logSocketEvent(
        prisma, 
        'disconnection', 
        socket.id, 
        socket.handshake.query.userId as string, 
        null, 
        duration
      );
    });
  });

  return io;
}

/**
 * Helper function to log socket events to database
 */
async function logSocketEvent(
  prisma: PrismaClient,
  eventType: string,
  socketId: string,
  userId?: string,
  payload?: any,
  duration?: number
): Promise<void> {
  try {
    await prisma.socketEvent.create({
      data: {
        event_type: eventType,
        socket_id: socketId,
        user_id: userId || null,
        payload: payload ? payload : Prisma.JsonNull,
        duration: duration || null,
        client_info: Prisma.JsonNull // Could capture browser info if needed
      }
    });
  } catch (err) {
    error('Failed to log socket event %s: %s', eventType, err instanceof Error ? err.message : String(err));
  }
}