import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ChatLangChainService } from '../../src/services/chat/chat-langchain.service.mjs';

// Mock the difficult dependencies but keep most of the integration intact
vi.mock('@langchain/langgraph/prebuilt', () => ({
  createReactAgent: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockRejectedValue(new Error('Agent error')),
  })),
  MemorySaver: class MockMemorySaver {},
}));

// Error case for MCP tools
vi.mock('@h1deya/langchain-mcp-tools', () => ({
  convertMcpToLangchainTools: vi.fn().mockRejectedValue(new Error('MCP server error')),
}));

describe('Error Handling Integration Test', () => {
  let mockPrisma: any;
  
  beforeEach(() => {
    // Create a minimal mock Prisma that doesn't break the tests
    mockPrisma = {
      chatMessage: {
        create: vi.fn().mockImplementation((data) => Promise.resolve({
          ...data.data,
          id: 'msg-' + Math.random().toString(36).substring(2, 9),
          created_at: new Date(),
          updated_at: new Date(),
        })),
        update: vi.fn().mockImplementation((data) => Promise.resolve(data.data)),
      },
      user: {
        upsert: vi.fn().mockImplementation((data) => Promise.resolve({
          id: data.where.id || 'test-user',
          name: 'Test User',
          email: 'test@example.com',
        })),
      },
      conversation: {
        create: vi.fn().mockImplementation((data) => Promise.resolve({
          ...data.data,
          id: 'conv-' + Math.random().toString(36).substring(2, 9),
        })),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    } as unknown as PrismaClient;
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('should handle errors gracefully with a fallback response', async () => {
    // This test simulates a catastrophic failure where the agent can't be initialized
    
    // Create the service
    const chatService = new ChatLangChainService(mockPrisma);
    
    // Set up callback mocks
    const mockCallbacks = {
      onChunk: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };
    
    // Send a message - this should trigger our graceful error handling
    const result = await chatService.processStreamingMessage(
      'Hello world',
      'test-user',
      mockCallbacks
    );
    
    // Verify we got a valid response despite the error
    expect(result).toBeDefined();
    expect(typeof result.content).toBe('string');
    expect(result.content.length).toBeGreaterThan(0);
    
    // Should have called the onChunk and onComplete callbacks
    expect(mockCallbacks.onChunk).toHaveBeenCalled();
    expect(mockCallbacks.onComplete).toHaveBeenCalled();
    
    // Should not have called the error callback
    expect(mockCallbacks.onError).not.toHaveBeenCalled();
  });
}); 