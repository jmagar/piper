import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { initWebSocket } from '../../src/websocket.js';
import { ChatLangChainService } from '../../src/services/chat/chat-langchain.service.mjs';
import { EventEmitter } from 'events';

// Mock the dependencies
vi.mock('socket.io', () => {
  const mockSocket = new EventEmitter();
  mockSocket.id = 'mock-socket-id';
  mockSocket.handshake = { query: { userId: 'test-user' } };
  mockSocket.emit = vi.fn();
  mockSocket.broadcast = { emit: vi.fn() };

  const mockServer = {
    on: vi.fn((event, callback) => {
      if (event === 'connection') {
        callback(mockSocket);
      }
      return mockServer;
    }),
    emit: vi.fn(),
  };

  return {
    Server: vi.fn(() => mockServer),
  };
});

vi.mock('../../src/services/chat/chat-langchain.service.mjs', () => {
  return {
    ChatLangChainService: vi.fn().mockImplementation(() => ({
      processStreamingMessage: vi.fn(),
      processMessage: vi.fn(),
      cleanupResources: vi.fn(),
    })),
  };
});

describe('WebSocket handler', () => {
  let httpServer: HttpServer;
  let mockPrisma: PrismaClient;
  let io: SocketIOServer;
  let mockSocket: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up mocks
    httpServer = { on: vi.fn() } as unknown as HttpServer;
    mockPrisma = {
      socketEvent: {
        create: vi.fn(),
      },
    } as unknown as PrismaClient;
    
    // Initialize the WebSocket server
    io = initWebSocket(httpServer, mockPrisma);
    
    // Get the mock socket
    mockSocket = io.on.mock.calls[0][1].arguments[0];
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should handle message:sent events and process messages', async () => {
    // Setup mock message
    const mockMessage = {
      id: 'test-msg-id',
      content: 'Hello, world!',
      userId: 'test-user',
      conversationId: 'test-conversation',
    };

    // Mock successful processing
    (ChatLangChainService.prototype.processStreamingMessage as any).mockResolvedValue({
      id: 'response-id',
      content: 'Hello from the assistant',
      role: 'assistant',
    });

    // Emit the message:sent event
    await mockSocket.emit('message:sent', mockMessage);

    // Verify that the socket emitted the expected events
    expect(mockSocket.emit).toHaveBeenCalledWith('message:new', expect.any(Object));
    expect(mockSocket.emit).toHaveBeenCalledWith('user:typing', expect.any(Object));
    
    // Verify that processStreamingMessage was called with the right parameters
    expect(ChatLangChainService.prototype.processStreamingMessage).toHaveBeenCalledWith(
      mockMessage.content,
      expect.any(String),
      expect.objectContaining({
        onChunk: expect.any(Function),
        onComplete: expect.any(Function),
        onError: expect.any(Function),
      }),
      mockMessage.conversationId
    );
  });

  it('should handle errors in message processing gracefully', async () => {
    // Setup mock message
    const mockMessage = {
      id: 'test-msg-id',
      content: 'Hello, world!',
      userId: 'test-user',
      conversationId: 'test-conversation',
    };

    // Mock error during processing
    (ChatLangChainService.prototype.processStreamingMessage as any).mockRejectedValue(
      new Error('Test error during processing')
    );

    // Emit the message:sent event
    await mockSocket.emit('message:sent', mockMessage);

    // Verify that error events were emitted
    expect(mockSocket.emit).toHaveBeenCalledWith('message:error', expect.objectContaining({
      error: expect.stringContaining('Test error'),
    }));
    
    // Verify that the user-friendly error message was sent
    expect(mockSocket.emit).toHaveBeenCalledWith('message:new', expect.objectContaining({
      content: expect.stringContaining('system error'),
      metadata: expect.objectContaining({
        error: 'system_error',
      }),
    }));
    
    // Verify typing indicator was stopped
    expect(mockSocket.emit).toHaveBeenCalledWith('user:stop_typing', expect.any(Object));
  });

  it('should handle errors in the onError callback', async () => {
    // Setup mock message
    const mockMessage = {
      id: 'test-msg-id',
      content: 'Hello, world!',
      userId: 'test-user',
      conversationId: 'test-conversation',
    };

    // Mock processStreamingMessage to save the callbacks
    let savedCallbacks: any;
    (ChatLangChainService.prototype.processStreamingMessage as any).mockImplementation(
      (_msg: string, _userId: string, callbacks: any) => {
        savedCallbacks = callbacks;
        return Promise.resolve({});
      }
    );

    // Emit the message:sent event
    await mockSocket.emit('message:sent', mockMessage);

    // Now simulate an error through the callback
    await savedCallbacks.onError(new Error('Error through callback'));

    // Verify that error events were emitted
    expect(mockSocket.emit).toHaveBeenCalledWith('message:error', expect.objectContaining({
      error: expect.stringContaining('Error through callback'),
    }));
    
    // Verify that the user-friendly error message was sent
    expect(mockSocket.emit).toHaveBeenCalledWith('message:new', expect.objectContaining({
      content: expect.stringContaining('encountered an error'),
      metadata: expect.objectContaining({
        error: 'processing_failed',
      }),
    }));
    
    // Verify typing indicator was stopped
    expect(mockSocket.emit).toHaveBeenCalledWith('user:stop_typing', expect.any(Object));
  });
}); 