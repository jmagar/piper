import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLangGraph } from '../../../src/langgraph/index.js';
import { PrismaClient } from '@prisma/client';
import { convertMcpToLangchainTools } from '@h1deya/langchain-mcp-tools';
import { HumanMessage } from '@langchain/core/messages';

// Mock the external dependencies
vi.mock('@h1deya/langchain-mcp-tools', () => ({
  convertMcpToLangchainTools: vi.fn(),
}));

vi.mock('../../../src/init-chat-model.js', () => ({
  initChatModel: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue('Test response'),
  }),
}));

vi.mock('../../../src/load-config.js', () => ({
  loadConfig: vi.fn().mockReturnValue({
    llm: {
      model_provider: 'test-provider',
      model: 'test-model',
      temperature: 0.5,
      max_tokens: 1000,
    },
    mcp_servers: {
      'test-server': {
        command: 'echo',
        args: ['hello'],
      },
    },
  }),
}));

vi.mock('../../../src/services/langgraph/state-persistence.mjs', () => ({
  LangGraphStatePersistence: vi.fn().mockImplementation(() => ({
    getState: vi.fn(),
    saveState: vi.fn(),
    deleteState: vi.fn(),
  })),
}));

describe('createLangGraph', () => {
  const mockPrisma = {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  } as unknown as PrismaClient;
  
  const mockTools = [
    {
      name: 'testTool',
      description: 'A test tool',
      schema: {},
      invoke: vi.fn(),
    },
  ];
  
  beforeEach(() => {
    vi.clearAllMocks();
    (convertMcpToLangchainTools as any).mockResolvedValue({
      tools: mockTools,
      cleanup: vi.fn(),
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should successfully create a LangGraph instance with tools', async () => {
    const langGraph = await createLangGraph(mockPrisma);
    expect(langGraph).toBeDefined();
    expect(langGraph.agent).toBeDefined();
    expect(langGraph.invoke).toBeDefined();
    expect(langGraph.clearHistory).toBeDefined();
    expect(langGraph.cleanupResources).toBeDefined();
  });

  it('should handle MCP server initialization errors gracefully', async () => {
    // Mock the convertMcpToLangchainTools to throw an error
    (convertMcpToLangchainTools as any).mockRejectedValue(
      new Error('Failed to initialize MCP server')
    );

    // The function should not throw an error
    const langGraph = await createLangGraph(mockPrisma);
    
    // It should still create a LangGraph instance with empty tools
    expect(langGraph).toBeDefined();
    expect(langGraph.agent).toBeDefined();
    expect(langGraph.invoke).toBeDefined();
    
    // Test invoking with an empty toolset
    const result = await langGraph.invoke('Hello', 'test-conversation');
    expect(result).toBeDefined();
  });

  it('should continue with available tools when some MCP servers fail', async () => {
    // Mock some servers failing but still returning some tools
    (convertMcpToLangchainTools as any).mockResolvedValue({
      tools: mockTools.slice(0, 1), // Return only one tool
      cleanup: vi.fn(),
      failedServers: ['failed-server-1', 'failed-server-2'],
    });

    const langGraph = await createLangGraph(mockPrisma);
    expect(langGraph).toBeDefined();
    expect(langGraph.agent).toBeDefined();
    
    // It should work with the available tools
    const result = await langGraph.invoke('Hello', 'test-conversation');
    expect(result).toBeDefined();
  });

  it('should handle invoke errors gracefully', async () => {
    const langGraph = await createLangGraph(mockPrisma);
    
    // Mock the agent's invoke method to throw an error
    langGraph.agent.invoke = vi.fn().mockRejectedValue(
      new Error('Agent execution error')
    );
    
    // The invoke method should propagate the error
    await expect(langGraph.invoke('Hello', 'test-conversation')).rejects.toThrow('Agent execution error');
  });
}); 