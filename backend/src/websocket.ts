import { Server } from 'socket.io';
import http from 'http';
import debug from 'debug';
import { ChatLangChainService } from './services/chat/chat-langchain.service.mjs';
import { PrismaClient } from '@prisma/client';
import type { Socket } from 'socket.io';

type HTTPServer = http.Server;

// Make Node.js global types available
/// <reference types="node" />

// Use a module-level variable instead of global
let socketServer: Server | undefined;

const log = debug('mcp:websocket');
const error = debug('mcp:websocket:error');

// Extended message type for WebSocket communication
interface WebSocketMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  createdAt: string;
  updatedAt: string;
  status: 'sending' | 'streaming' | 'sent' | 'error';
  userId?: string;
  username?: string;
  conversationId?: string;
  parentId?: string;
  metadata?: {
    timestamp?: string;
    streamStatus?: 'streaming' | 'complete' | 'error';
    streamStartTime?: string;
    streamEndTime?: string;
    type?: string;
    error?: string;
    [key: string]: unknown;
  };
}

// Type definitions for Socket.IO events
interface ServerToClientEvents {
  'message:new': (message: WebSocketMessage) => void;
  'message:chunk': (data: { 
    messageId: string, 
    chunk: string,
    status?: 'streaming',
    metadata?: {
      streamStatus?: 'streaming' | 'complete' | 'error',
      timestamp?: string,
      [key: string]: unknown
    }
  }) => void;
  'message:complete': (data: { 
    messageId: string,
    metadata?: {
      streamStatus?: 'complete',
      streamEndTime?: string,
      [key: string]: unknown
    }
  }) => void;
  'message:error': (data: { messageId: string, error: string }) => void;
  'debug:event': (logData: {
    namespace: string;
    args: string[];
    timestamp: string;
    level: string;
  }) => void;
}

interface ClientToServerEvents {
  'message:sent': (message: WebSocketMessage, callback: (response: { error?: string; message?: WebSocketMessage }) => void) => void;
  disconnect: () => void;
}

interface User {
  id: string;
}

// Setup debug namespaces to forward to frontend
const debugNamespaces = [
  'mcp:websocket',
  'mcp:chat:langchain',
  'mcp:langgraph',
  'mcp:langgraph:error',
  'mcp:chat:langchain:error'
];

// Override debug functions to emit events to clients
debugNamespaces.forEach(namespace => {
  const debugInstance = debug(namespace);
  const originalLog = debugInstance.log;
  
  // Override the log method to emit events
  debugInstance.log = function(...args: string[]) {
    // Call original log
    originalLog.apply(this, args);
    
    // Forward to WebSocket clients if server is initialized
    if (socketServer) {
      socketServer.emit('debug:event', {
        namespace,
        args: args.map(arg => String(arg)),
        timestamp: new Date().toISOString(),
        level: namespace.includes(':error') ? 'error' : 'info'
      });
    }
  };
});

export async function initWebSocket(server: HTTPServer, prisma: PrismaClient): Promise<void> {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    User
  >(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Store io instance in module-level variable
  socketServer = io;

  // Create services
  const chatLangChainService = new ChatLangChainService(prisma);

  // Socket.IO setup
  io.on('connection', (socket: Socket) => {
    log('Client connected: %s', socket.id);

    socket.on('disconnect', () => {
      log('Client disconnected: %s', socket.id);
    });

    socket.on('message:sent', async (message: WebSocketMessage, callback) => {
      const userId = message.userId || 'anonymous';
      log('Message from %s: %s', userId, message.content);
      
      try {
        // Immediately update client that we received the message
        const streamingMessage: WebSocketMessage = {
          ...message,
          status: 'streaming',
          metadata: {
            ...message.metadata,
            streamStatus: 'streaming',
            streamStartTime: new Date().toISOString()
          }
        };
        
        // Respond to original message with streaming update
        callback({ message: streamingMessage });
        
        // Create a message ID for the assistant's response
        const assistantMessageId = `assistant-${Date.now()}`;
        
        // Create and emit an empty message for the assistant's response
        const assistantMessage: WebSocketMessage = {
          id: assistantMessageId,
          content: 'Thinking...',
          role: 'assistant',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'streaming',
          conversationId: message.conversationId,
          parentId: message.id,
          metadata: {
            timestamp: new Date().toISOString(),
            streamStatus: 'streaming',
            streamStartTime: new Date().toISOString(),
            type: 'text'
          }
        };
        
        // Emit the assistant message to the client
        socket.emit('message:new', assistantMessage);
        
        // Process message with streaming
        let totalContent = ''; // Track total content streamed
        let chunkCounter = 0;
        const streamingOptions = {
          onChunk: async (chunk: string) => {
            // Track total streamed content so we never lose it
            totalContent += chunk;
            
            // Always log chunk details for debugging
            console.log(`Streaming chunk received: ${chunk.length} chars, total now: ${totalContent.length}`);
            
            socket.emit('message:chunk', {
              messageId: assistantMessage.id,
              chunk,
              metadata: {
                timestamp: new Date().toISOString(),
                chunkNumber: chunkCounter++,
                totalLength: totalContent.length
              }
            });
          },
          onError: async (err: Error) => {
            log('Error during streaming: %s', err.message);
            socket.emit('message:error', {
              messageId: assistantMessage.id,
              error: err.message
            });
          },
          onComplete: async () => {
            // Ensure we always have the final content length in logs
            log('Streaming complete, total content length: %d', totalContent.length);
            
            // CRITICAL: Emit a fallback message if somehow no content was accumulated
            if (totalContent.length === 0) {
              log('WARNING: No content was accumulated during streaming!');
              totalContent = "I apologize, but I wasn't able to generate a response. Please try again or rephrase your question.";
            }
            
            // Always emit message complete with the final content
            socket.emit('message:complete', {
              messageId: assistantMessage.id,
              metadata: {
                timestamp: new Date().toISOString(),
                totalContentLength: totalContent.length,
                streamEndTime: new Date().toISOString(),
                finalContent: totalContent.substring(0, 100) + '...',
                completeContent: totalContent
              }
            });
          }
        };
        
        await chatLangChainService.processStreamingMessage(
          message.content, 
          userId,
          streamingOptions,
          message.conversationId
        );
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        error('Error processing message: %s', errorMessage);
        
        // Send error to client
        socket.emit('message:error', {
          messageId: message.id,
          error: errorMessage
        });
        
        callback({ error: errorMessage });
      }
    });
  });
}
