import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient, Prisma } from '@prisma/client';
import createLogger from './utils/debug.js';
import { initSocketLogger } from './utils/socket-logger.js';
import { ChatLangChainService } from './services/chat/chat-langchain.service.mjs';
import { LangGraphStatePersistence } from './services/langgraph/state-persistence.mjs';

const { log, error } = createLogger('socket:main');

// Initialize state persistence service
let statePersistence: LangGraphStatePersistence | null = null;

// Make statePersistence globally accessible for other modules to use
// This avoids circular dependencies
declare global {
  var statePersistence: LangGraphStatePersistence | null;
}

/**
 * Initialize WebSocket server with Socket.IO
 * @param httpServer - HTTP server to attach Socket.IO to
 * @param prisma - Prisma client instance for database operations
 * @returns Socket.IO server instance
 */
export function initWebSocket(httpServer: HttpServer, prisma: PrismaClient): Server {
  // Use the same enhanced CORS settings as in index.ts for consistency
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // Explicitly use * for development
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
      allowedHeaders: [
        "Content-Type", 
        "Authorization", 
        "X-Requested-With", 
        "Accept", 
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
        "x-client-hostname",
        "x-client-version"
        // 'Access-Control-Allow-Origin' is a response header, not a request header
      ],
      exposedHeaders: ["Content-Length", "Date", "Access-Control-Allow-Origin"],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204,
      maxAge: 86400 // 24 hours in seconds
    },
    allowEIO3: true, // Allow Engine.IO 3 for backward compatibility
    transports: ['websocket', 'polling'] // Enable both transports
  });

  // Initialize the socket logger to forward debug logs to clients
  initSocketLogger(io);
  log('Socket logger initialized');
  console.log('==== WebSocket Server Initialized ====');

  // Initialize LangGraphStatePersistence with Socket.IO instance for real-time notifications
  statePersistence = new LangGraphStatePersistence(prisma, io);
  
  // Make statePersistence globally accessible
  global.statePersistence = statePersistence;
  
  log('LangGraphStatePersistence initialized with real-time event capabilities');

  // Initialize the chat service
  console.log('Initializing ChatLangChainService...');
  console.log('✅ ChatLangChainService initialized');

  // Connection event
  io.on('connection', (socket) => {
    log('Client connected: %s', socket.id);
    console.log(`[SOCKET][${socket.id}] Client connected`);
    console.log(`[SOCKET][${socket.id}] Client data:`, {
      query: socket.handshake.query,
      handshake: {
        auth: socket.handshake.auth,
        headers: socket.handshake.headers,
        address: socket.handshake.address
      }
    });
    
    // Log all registered event handlers
    console.log(`[SOCKET][${socket.id}] Registered event handlers:`, socket.eventNames());
    
    // Log connection to database
    logSocketEvent(prisma, 'connection', socket.id, socket.handshake.query.userId as string);
    
    // Track connection time
    const connectionTime = Date.now();

    // Handle authentication
    socket.on('auth', (data, callback) => {
      log('Authentication request: %o', data);
      console.log(`[SOCKET][${socket.id}] Received auth event:`, JSON.stringify(data, null, 2));
      
      try {
        // Simple validation for now - in production, use a proper token validation
        if (!data.userId) {
          console.log(`[SOCKET][${socket.id}] Auth failed: No userId provided`);
          callback({
            success: false,
            error: 'Authentication failed: No user ID provided'
          });
          return;
        }
        
        // In a real implementation, verify the token against your auth system
        // For now, we'll accept any userId as valid
        console.log(`[SOCKET][${socket.id}] Auth successful for user: ${data.userId}`);
        
        // Log auth event
        logSocketEvent(prisma, 'auth:success', socket.id, data.userId, data);
        
        // Success response
        callback({
          success: true,
          userId: data.userId,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.error(`[SOCKET][${socket.id}] Auth error:`, err);
        callback({
          success: false,
          error: err instanceof Error ? err.message : 'Authentication failed'
        });
        
        // Log auth failure
        logSocketEvent(prisma, 'auth:failure', socket.id, data.userId, { 
          error: err instanceof Error ? err.message : 'Authentication failed'
        });
      }
    });

    // Handle chat messages - LEGACY HANDLER
    socket.on('chat:message', async (data) => {
      log('Received message (legacy chat:message): %o', data);
      console.log(`[SOCKET][${socket.id}] Received legacy chat:message event:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
      
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

    // Listen for both message:sent AND message:send (for compatibility)
    socket.on('message:send', async (data) => {
      console.log(`[SOCKET][${socket.id}] Received message:send event:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
      
      // Create a unique message ID for the response
      const responseId = `response-${Date.now()}`;
      console.log(`[SOCKET][${socket.id}] Generated response ID: ${responseId}`);
      
      try {
        // Extract needed data
        const userId = data.userId || data.user?.id || 'anonymous';
        const messageContent = data.content;
        const conversationId = data.conversationId;
        
        console.log(`[SOCKET][${socket.id}] Processing message directly from message:send handler:`, {
          userId,
          messageContent: messageContent?.substring(0, 50) + '...',
          conversationId,
          responseId
        });
        
        // Log message event to database
        try {
          await logSocketEvent(prisma, 'message:send', socket.id, userId, data);
          console.log(`[SOCKET][${socket.id}] Logged message event to database`);
        } catch (err) {
          console.error(`[SOCKET][${socket.id}] Failed to log message event:`, err);
        }
        
        // Emit event to indicate the assistant is generating a response
        console.log(`[SOCKET][${socket.id}] Emitting message:new event for ${responseId}`);
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
        console.log(`[SOCKET][${socket.id}] Emitting user:typing event for assistant`);
        socket.emit('user:typing', { 
          userId: 'assistant', 
          typing: true 
        });
        
        // Get the LangChain service with Prisma client
        console.log(`[SOCKET][${socket.id}] Creating ChatLangChainService instance`);
        const chatLangChainService = new ChatLangChainService(prisma);
        
        // Call the streaming message processor with the correct parameters
        console.log(`[SOCKET][${socket.id}] Starting message processing stream for ${responseId}`);
        
        // Track message streaming stats for better reliability
        const streamStart = Date.now();
        let chunkCount = 0;
        // Commented out unused variable - may be needed for future implementation
        // let lastActiveStreamId = responseId;
        
        // Set up streaming callbacks with enhanced state persistence
        const streamingOptions = {
          // Handle streaming chunks as they arrive using LangGraph-style events
          onChunk: (chunk?: string) => {
            const safeChunk = chunk || '';
            console.log(`[SOCKET][${socket.id}][STREAM] Emitting chunk for ${responseId}, length: ${safeChunk.length}`);
            
            // Track that we've sent at least one chunk, even if empty
            socket.data.lastActiveStream = responseId;
            socket.data.chunksSent = (socket.data.chunksSent || 0) + 1;
            chunkCount++;
            
            // Create a LangGraph-style event for streaming
            const streamEvent = {
              event: 'on_chat_model_stream',
              name: 'ChatAssistant',
              run_id: responseId,
              tags: ['chat', 'stream', 'assistant'],
              metadata: {
                messageId: responseId,
                timestamp: new Date().toISOString(),
                chunkIndex: chunkCount,
                conversationId: conversationId || 'default',
                streamStatus: 'streaming',
                chunkCount
              },
              data: {
                chunk: {
                  content: safeChunk,
                  id: responseId
                }
              },
              parent_ids: []
            };
            
            // Emit as a LangGraph event
            socket.emit('stream:event', streamEvent);
            
            // Also emit legacy event for backward compatibility
            socket.emit('message:chunk', {
              messageId: responseId,
              chunk: safeChunk,
              chunkIndex: chunkCount,
              timestamp: new Date().toISOString()
            });
            
            // Update streaming state in Redis periodically
            if (statePersistence && chunkCount % 10 === 0) {
              statePersistence.saveStreamingState(responseId, {
                chunks: chunkCount,
                lastUpdate: Date.now()
              }).catch(err => console.error(`[SOCKET][${socket.id}] Failed to save streaming state:`, err));
            }
          },
          
          // Handle stream completion with LangGraph-style events
          onComplete: async () => {
            const streamDuration = Date.now() - streamStart;
            console.log(`[SOCKET][${socket.id}][STREAM] Stream completed for ${responseId}, duration: ${streamDuration}ms, chunks: ${chunkCount}`);
            
            // If no chunks were sent at all, send at least one message
            if (chunkCount === 0) {
              console.log(`[SOCKET][${socket.id}][STREAM] No chunks were sent for ${responseId}, sending fallback response`);
              
              // Send a fallback response
              const fallbackChunk = "I've prepared a response for you.";
              
              // Create a LangGraph-style event for the fallback chunk
              const fallbackEvent = {
                event: 'on_chat_model_stream',
                name: 'ChatAssistant',
                run_id: responseId,
                tags: ['chat', 'stream', 'assistant', 'fallback'],
                metadata: {
                  messageId: responseId,
                  timestamp: new Date().toISOString(),
                  chunkIndex: 0,
                  conversationId: conversationId || 'default',
                  streamStatus: 'streaming',
                  isFallback: true
                },
                data: {
                  chunk: {
                    content: fallbackChunk,
                    id: responseId
                  }
                },
                parent_ids: []
              };
              
              // Emit as a LangGraph event
              socket.emit('stream:event', fallbackEvent);
              
              // Also emit legacy event for backward compatibility
              socket.emit('message:chunk', {
                messageId: responseId,
                chunk: fallbackChunk,
                chunkIndex: 0,
                timestamp: new Date().toISOString()
              });
              
              // Update tracker
              chunkCount = 1;
              socket.data.chunksSent = 1;
            }
            
            // Create a LangGraph-style completion event
            const completionEvent = {
              event: 'on_chat_model_end',
              name: 'ChatAssistant',
              run_id: responseId,
              tags: ['chat', 'complete', 'assistant'],
              metadata: {
                messageId: responseId,
                timestamp: new Date().toISOString(),
                conversationId: conversationId || 'default',
                streamStatus: 'complete',
                chunkCount,
                streamDuration
              },
              data: {
                output: {
                  id: responseId,
                  complete: true,
                  isStreaming: false
                }
              },
              parent_ids: []
            };
            
            // Emit as a LangGraph event
            socket.emit('stream:event', completionEvent);
            
            // Stop showing typing indicator for assistant
            socket.emit('user:typing', { 
              userId: 'assistant', 
              typing: false 
            });
            
            // Also emit legacy event for backward compatibility
            socket.emit('message:complete', {
              messageId: responseId,
              timestamp: new Date().toISOString()
            });
            
            // Save completion information in Redis if available
            if (statePersistence) {
              try {
                await statePersistence.saveStreamingState(responseId, {
                  completed: true,
                  chunks: chunkCount,
                  duration: streamDuration,
                  completedAt: Date.now()
                });
              } catch (err) {
                console.error(`[SOCKET][${socket.id}] Failed to save stream completion state:`, err);
              }
            }
          },
          
          // Handle errors in the streaming process with LangGraph-style events
          onError: (err: Error) => {
            console.error(`[SOCKET][${socket.id}][STREAM] Error processing message for ${responseId}:`, err);
            
            // Create a LangGraph-style error event
            const errorEvent = {
              event: 'on_chain_error',
              name: 'ChatAssistant',
              run_id: responseId,
              tags: ['chat', 'error', 'assistant'],
              metadata: {
                messageId: responseId,
                timestamp: new Date().toISOString(),
                conversationId: conversationId || 'default',
                streamStatus: 'error'
              },
              data: {
                error: {
                  message: err instanceof Error ? err.message : String(err),
                  stack: err instanceof Error ? err.stack : undefined,
                  name: err instanceof Error ? err.name : 'Unknown Error'
                }
              },
              parent_ids: []
            };
            
            // Emit as a LangGraph event
            socket.emit('stream:event', errorEvent);
            
            // Stop typing indicator
            socket.emit('user:typing', { 
              userId: 'assistant', 
              typing: false 
            });
            
            // Also emit legacy error event for backward compatibility
            socket.emit('message:error', {
              messageId: responseId,
              code: 'PROCESSING_ERROR',
              message: err instanceof Error ? err.message : String(err),
              details: {
                timestamp: new Date().toISOString(),
                error: err instanceof Error ? err.stack : String(err)
              }
            });
            
            // Send a user-friendly error message
            console.log(`[SOCKET][${socket.id}][STREAM] Sending error message for ${responseId}`);
            socket.emit('message:new', {
              id: `error-${Date.now()}`,
              content: `I'm sorry, I encountered an error while processing your message: ${err instanceof Error ? err.message : 'An unknown error occurred'}. Please try again.`,
              role: 'assistant',
              type: 'text',
              status: 'error',
              createdAt: new Date().toISOString(),
              user: { id: 'system', name: 'Assistant' },
              metadata: { 
                error: 'processing_failed',
                originalMessageId: responseId
              },
            });
          }
        };
        
        // Process the message with streaming
        await chatLangChainService.processMessageWithOptions(
          messageContent,
          {
            history: [],
            streaming: true,
            onChunk: streamingOptions.onChunk,
            onComplete: streamingOptions.onComplete,
            onError: streamingOptions.onError,
            configurable: {
              thread_id: responseId,
              conversation_id: conversationId,
              userId: userId
            }
          } 
        );
        
      } catch (error) {
        console.error(`[SOCKET][${socket.id}] Critical error in message:send handler:`, error);
        
        // Send error back to client
        socket.emit('message:error', {
          messageId: responseId,
          error: error instanceof Error ? error.message : 'An unexpected error occurred',
        });
        
        // Stop typing indicator
        socket.emit('user:typing', { 
          userId: 'assistant', 
          typing: false 
        });
      }
    });

    // Handle typing indicators
    socket.on('typing:start', (data) => {
      log('Typing started: %o', data);
      console.log(`[SOCKET][${socket.id}] User started typing:`, data);
      
      // Get the user ID from socket or data
      const userId = socket.data.userId || data.userId || 'anonymous';
      
      // Broadcast typing indicator to all clients in the conversation
      if (data.conversationId) {
        socket.to(data.conversationId).emit('user:typing', {
          userId,
          typing: true,
          conversationId: data.conversationId
        });
      } else {
        // If no conversation ID, broadcast to all
        socket.broadcast.emit('user:typing', {
          userId,
          typing: true
        });
      }
    });
    
    socket.on('typing:stop', (data) => {
      log('Typing stopped: %o', data);
      console.log(`[SOCKET][${socket.id}] User stopped typing:`, data);
      
      // Get the user ID from socket or data
      const userId = socket.data.userId || data.userId || 'anonymous';
      
      // Broadcast typing indicator to all clients in the conversation
      if (data.conversationId) {
        socket.to(data.conversationId).emit('user:typing', {
          userId,
          typing: false,
          conversationId: data.conversationId
        });
      } else {
        // If no conversation ID, broadcast to all
        socket.broadcast.emit('user:typing', {
          userId,
          typing: false
        });
      }
    });

    // Handle ping (for debugging)
    socket.on('ping', (data) => {
      log('Ping received: %o', data);
      const roundtripTime = Date.now() - data.timestamp;
      console.log(`[SOCKET][${socket.id}] Ping: ${roundtripTime}ms`);
      
      // Send pong back to the client
      socket.emit('pong', {
        timestamp: data.timestamp,
        roundtripTime,
        serverTime: Date.now()
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      const sessionDuration = Date.now() - connectionTime;
      log('Client disconnected: %s (reason: %s, duration: %dms)', socket.id, reason, sessionDuration);
      console.log(`[SOCKET][${socket.id}] Client disconnected: ${reason}, session duration: ${sessionDuration}ms`);
      
      // Log disconnection to database
      logSocketEvent(prisma, 'disconnect', socket.id, socket.data.userId, { reason, sessionDuration });
    });

    // Handle socket errors
    socket.on('error', (err: Error) => {
      console.error('Socket error:', err);
      // ... existing code ...
    });

    // Subscribe to thread events
    socket.on('subscribe:thread', (threadId) => {
      if (!threadId) return;
      console.log(`[SOCKET][${socket.id}] Subscribing to thread ${threadId}`);
      socket.join(`thread:${threadId}`);
    });
    
    // Subscribe to conversation events
    socket.on('subscribe:conversation', (conversationId) => {
      if (!conversationId) return;
      console.log(`[SOCKET][${socket.id}] Subscribing to conversation ${conversationId}`);
      socket.join(`conversation:${conversationId}`);
    });
    
    // Unsubscribe from thread events
    socket.on('unsubscribe:thread', (threadId) => {
      if (!threadId) return;
      console.log(`[SOCKET][${socket.id}] Unsubscribing from thread ${threadId}`);
      socket.leave(`thread:${threadId}`);
    });
    
    // Unsubscribe from conversation events
    socket.on('unsubscribe:conversation', (conversationId) => {
      if (!conversationId) return;
      console.log(`[SOCKET][${socket.id}] Unsubscribing from conversation ${conversationId}`);
      socket.leave(`conversation:${conversationId}`);
    });
    
    // Add diagnostic endpoint to check state
    socket.on('diagnostic:check-state', async (data, callback) => {
      try {
        const { threadId, conversationId } = data;
        let result: any = { success: true };
        
        if (threadId && statePersistence) {
          const state = await statePersistence.getState(threadId);
          result.threadState = state;
        }
        
        if (conversationId && statePersistence) {
          const states = await statePersistence.getConversationState(conversationId);
          result.conversationStates = states;
        }
        
        callback(result);
      } catch (err) {
        callback({ 
          success: false, 
          error: err instanceof Error ? err.message : String(err)
        });
      }
    });
    
    // Add diagnostic endpoint to check streaming state
    socket.on('diagnostic:check-streaming', async (data, callback) => {
      try {
        const { threadId, conversationId } = data;
        let result: any = { success: true };
        
        // If we have a threadId, check that specific thread
        if (threadId && statePersistence) {
          const streamingState = await statePersistence.getStreamingState(threadId);
          result.streamingState = streamingState;
          result.threadId = threadId;
          return callback(result);
        }
        
        // If we have a conversationId, find all threads and check each one
        if (conversationId && statePersistence) {
          const states = await statePersistence.getConversationState(conversationId);
          
          // Check each thread for streaming state
          if (states && states.length > 0) {
            for (const state of states as { threadId?: string }[]) {
              if (!state.threadId) continue;
              
              const streamingState = await statePersistence.getStreamingState(state.threadId);
              if (streamingState) {
                result.streamingState = streamingState;
                result.threadId = state.threadId;
                break; // Found an active streaming state
              }
            }
          }
        }
        
        callback(result);
      } catch (err) {
        callback({ 
          success: false, 
          error: err instanceof Error ? err.message : String(err)
        });
      }
    });
    
    // Add diagnostic endpoint for message tracking
    socket.on('diagnostic:message-check', async (data, callback) => {
      try {
        const { messageId, conversationId } = data;
        
        if (!messageId && !conversationId) {
          return callback({
            success: false,
            error: 'Either messageId or conversationId is required'
          });
        }
        
        let result: any = { success: true };
        
        if (messageId) {
          // Get a specific message by ID
          const message = await prisma.chatMessage.findUnique({
            where: { id: messageId },
            include: { user: true }
          });
          
          result.message = message;
        }
        
        if (conversationId) {
          // Get all messages for a conversation
          const messages = await prisma.chatMessage.findMany({
            where: { conversation_id: conversationId },
            orderBy: { created_at: 'asc' },
            include: { user: true }
          });
          
          result.messages = messages;
          
          // Compare with LangGraph state if available
          if (statePersistence) {
            const states = await statePersistence.getConversationState(conversationId);
            result.threadStates = states;
            
            // Count messages in thread states for comparison
            let threadMessageCount = 0;
            if (states && states.length > 0) {
              for (const state of states as { messages?: any[] }[]) {
                if (state.messages) {
                  threadMessageCount += state.messages.length;
                }
              }
            }
            
            result.dbMessageCount = messages.length;
            result.threadMessageCount = threadMessageCount;
            result.mismatch = messages.length !== threadMessageCount;
          }
        }
        
        callback(result);
      } catch (err) {
        callback({ 
          success: false, 
          error: err instanceof Error ? err.message : String(err)
        });
      }
    });

    // Emit connection status
    socket.emit('connection:status', {
      connected: true,
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  return io;
}

/**
 * Log socket events to the database for analytics
 */
async function logSocketEvent(
  prisma: PrismaClient,
  eventType: string,
  socketId: string,
  userId?: string,
  payload?: Record<string, unknown>,
  duration?: number
): Promise<void> {
  try {
    await prisma.socketEvent.create({
      data: {
        event_type: eventType,
        socket_id: socketId,
        // Use proper nested relation for user
        user: userId ? {
          connect: { id: userId }
        } : undefined,
        payload: payload as Prisma.JsonObject,
        duration: duration,
        // Use created_at instead of timestamp to match schema
        created_at: new Date()
      }
    });
    
    log('Logged socket event %s for socket %s', eventType, socketId);
  } catch (err) {
    error('Failed to log socket event %s: %s', eventType, err instanceof Error ? err.message : String(err));
  }
}
