import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatLangChainService } from '../../../src/services/chat/chat-langchain.service.mjs';
import { PrismaClient } from '@prisma/client';
import { createLangGraph } from '../../../src/langgraph/index.js';

// Mock the external dependencies
vi.mock('../../../src/langgraph/index.js', () => ({
  createLangGraph: vi.fn(),
}));

// Mock debug
vi.mock('debug', () => ({
  default: vi.fn().mockImplementation(() => vi.fn()),
}));

describe('ChatLangChainService', () => {
  let chatService: ChatLangChainService;
  const mockPrisma = {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    user: {
      upsert: vi.fn().mockImplementation((params) => Promise.resolve({
        id: params.where.id || 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
      })),
    },
    conversation: {
      findUnique: vi.fn().mockImplementation((params) => 
        params.where.id === 'existing-conv' 
          ? Promise.resolve({ id: 'existing-conv', user_id: 'test-user-id', title: 'Test Conversation' })
          : Promise.resolve(null)
      ),
      create: vi.fn().mockImplementation(() => Promise.resolve({
        id: 'new-conv-id',
        user_id: 'test-user-id',
        title: 'New Conversation',
      })),
      update: vi.fn(),
    },
    chatMessage: {
      create: vi.fn().mockImplementation((params) => Promise.resolve({
        id: 'msg-' + Date.now(),
        content: params.data.content,
        role: params.data.role,
        conversation_id: params.data.conversation_id,
        user_id: params.data.user_id,
        parent_id: params.data.parent_id,
        metadata: params.data.metadata,
        status: params.data.status,
        created_at: new Date(),
        updated_at: new Date(),
      })),
      update: vi.fn(),
    },
  } as unknown as PrismaClient;

  const mockLangGraph = {
    agent: {
      invoke: vi.fn().mockResolvedValue('Mock agent response'),
    },
    invoke: vi.fn().mockResolvedValue('Mock response'),
    clearHistory: vi.fn(),
    cleanupResources: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createLangGraph as any).mockResolvedValue(mockLangGraph);
    chatService = new ChatLangChainService(mockPrisma);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('graceful degradation', () => {
    it('should handle agent initialization failure gracefully in processStreamingMessage', async () => {
      // Mock agent initialization to return null (failure case)
      (createLangGraph as any).mockResolvedValue(null);

      // Streaming callbacks
      const mockCallbacks = {
        onChunk: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      // Send a message when agent is not available
      const result = await chatService.processStreamingMessage(
        'Hello world',
        'test-user-id',
        mockCallbacks
      );

      // It should still return a chat message
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('string');
      
      // The fallback response should have been sent
      expect(mockCallbacks.onChunk).toHaveBeenCalled();
      expect(mockCallbacks.onComplete).toHaveBeenCalled();
      expect(mockCallbacks.onError).not.toHaveBeenCalled();
      
      // Message should be marked as sent, not error
      expect(mockPrisma.chatMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'sent',
          }),
        })
      );
    });

    it('should handle agent initialization failure gracefully in processMessage', async () => {
      // Mock agent initialization to return null (failure case)
      (createLangGraph as any).mockResolvedValue(null);

      // Send a message when agent is not available
      const result = await chatService.processMessage(
        'Hello world',
        'test-user-id'
      );

      // It should still return a chat message
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('string');
      expect(result.metadata).toHaveProperty('error', 'agent_unavailable');
      
      // Message should be marked as sent, not error
      expect(mockPrisma.chatMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'sent',
          }),
        })
      );
    });

    it('should provide appropriate fallback responses based on user queries', async () => {
      // Mock agent initialization to return null (failure case)
      (createLangGraph as any).mockResolvedValue(null);
      
      // Setup different message types
      const messages = [
        { content: 'hello', expected: /hello/i },
        { content: 'help me with something', expected: /help/i },
        { content: 'what\'s the weather like?', expected: /weather/i },
        { content: 'random question', expected: /technical difficulties/i },
      ];
      
      // Create mocks for callbacks
      const mockCallbacks = {
        onChunk: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };
      
      // Test each message type
      for (const msg of messages) {
        // Reset mocks
        mockCallbacks.onChunk.mockReset();
        
        // Process the message
        await chatService.processStreamingMessage(
          msg.content,
          'test-user-id',
          mockCallbacks
        );
        
        // Verify the response contains the expected pattern
        expect(mockCallbacks.onChunk).toHaveBeenCalled();
        const responseArg = mockCallbacks.onChunk.mock.calls[0][0];
        expect(responseArg).toMatch(msg.expected);
      }
    });
  });
}); 