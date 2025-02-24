import { convertMcpToLangchainTools } from '@h1deya/langchain-mcp-tools';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { StructuredTool } from '@langchain/core/tools';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { z } from 'zod';

import { initChatModel } from '../init-chat-model.js';
import { loadConfig } from '../load-config.js';

import { createLangGraph } from './index.js';

interface AgentState {
  messages: BaseMessage[];
}

interface AgentConfig {
  thread_id: string;
}

// Mock dependencies
vi.mock('../load-config.js');
vi.mock('../init-chat-model.js');
vi.mock('@h1deya/langchain-mcp-tools');

// Mock json-schema-to-zod module
vi.mock('@n8n/json-schema-to-zod', () => ({
  parseSchema: vi.fn().mockReturnValue(z.object({
    param: z.string()
  }))
}));

// Mock LangGraph module
vi.mock('@langchain/langgraph/prebuilt', () => ({
  createReactAgent: vi.fn().mockImplementation(({ llm, tools }) => ({
    invoke: async ({ messages }: AgentState, { configurable }: { configurable: AgentConfig }) => {
      const lastMessage = messages[messages.length - 1];
      if (typeof lastMessage.content === 'string' && lastMessage.content.includes('use tool')) {
        // Simulate tool usage
        const tool = tools[0];
        const result = await tool.invoke({ param: 'test' });
        return {
          messages: [
            ...messages,
            new AIMessage('Used tool ' + tool.name + ' with result: ' + JSON.stringify(result))
          ]
        };
      }
      return {
        messages: [
          ...messages,
          new AIMessage('Simple response')
        ]
      };
    }
  }))
}));

describe('LangGraph Implementation', () => {
  const mockLLM = mockDeep<BaseChatModel>();
  const mockToolInvoke = vi.fn().mockResolvedValue({ result: 'tool result' });
  const mockTools = [{
    name: 'test_tool',
    description: 'A test tool',
    schema: z.object({
      param: z.string()
    }),
    invoke: mockToolInvoke,
    returnDirect: false,
    verboseParsingErrors: false,
    lc_namespace: ['langchain', 'tools'],
    _call: async (input: any) => mockToolInvoke(input),
    call: async (input: any) => mockToolInvoke(input)
  }] as unknown as StructuredTool<z.ZodObject<any>>[];

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();
    mockReset(mockLLM);

    // Setup default mock implementations
    vi.mocked(loadConfig).mockReturnValue({
      llm: {
        model_provider: 'test',
        model: 'test-model',
        temperature: 0.7,
        max_tokens: 1000
      },
      mcp_servers: {}
    });

    vi.mocked(initChatModel).mockReturnValue(mockLLM);
    vi.mocked(convertMcpToLangchainTools).mockResolvedValue({
      tools: mockTools,
      cleanup: vi.fn()
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a LangGraph instance', async () => {
    const graph = await createLangGraph();
    expect(graph).toBeDefined();
    expect(graph.invoke).toBeInstanceOf(Function);
    expect(graph.cleanupResources).toBeInstanceOf(Function);
  });

  it('should handle direct responses without tool use', async () => {
    const graph = await createLangGraph();
    const response = await graph.invoke('Hello');
    expect(response).toBe('Simple response');
  });

  it('should handle tool execution', async () => {
    const graph = await createLangGraph();
    const response = await graph.invoke('Please use tool');
    expect(mockToolInvoke).toHaveBeenCalledWith({ param: 'test' });
    expect(response).toContain('tool result');
  });

  it('should handle tool execution errors gracefully', async () => {
    // Setup tool to throw error
    mockToolInvoke.mockRejectedValueOnce(new Error('Tool failed'));
    
    const graph = await createLangGraph();
    await expect(graph.invoke('Please use tool')).rejects.toThrow();
  });

  it('should handle LLM errors gracefully', async () => {
    mockLLM.invoke.mockRejectedValueOnce(new Error('LLM failed'));
    
    const graph = await createLangGraph();
    await expect(graph.invoke('Hello')).rejects.toThrow();
  });

  it('should cleanup resources when requested', async () => {
    const cleanupMock = vi.fn();
    vi.mocked(convertMcpToLangchainTools).mockResolvedValueOnce({
      tools: mockTools,
      cleanup: cleanupMock
    });

    const graph = await createLangGraph();
    await graph.cleanupResources();
    expect(cleanupMock).toHaveBeenCalled();
  });

  it('should maintain conversation history', async () => {
    const graph = await createLangGraph();
    
    // First message
    await graph.invoke('Hello', 'test-conv');
    
    // Second message in same conversation
    await graph.invoke('How are you?', 'test-conv');
    
    // Get the mock calls to verify history was passed
    const calls = vi.mocked(await import('@langchain/langgraph/prebuilt')).createReactAgent.mock.calls;
    expect(calls.length).toBe(1);
    
    // Verify the messages in the invoke calls
    const invokeCalls = vi.mocked(await import('@langchain/langgraph/prebuilt')).createReactAgent.mock.results[0]?.value.invoke.mock.calls;
    expect(invokeCalls?.length).toBe(2);
    
    // Second call should have both messages in history
    const lastCall = invokeCalls?.[1];
    expect(lastCall?.[0].messages).toHaveLength(3); // Including system message
    expect(lastCall?.[0].messages[1].content).toBe('Hello');
    expect(lastCall?.[0].messages[2].content).toBe('How are you?');
  });

  it('should keep separate histories for different conversations', async () => {
    const graph = await createLangGraph();
    
    // Messages in first conversation
    await graph.invoke('Hello', 'conv1');
    await graph.invoke('How are you?', 'conv1');
    
    // Message in second conversation
    await graph.invoke('Hi there', 'conv2');
    
    // Get the mock calls to verify histories
    const invokeCalls = vi.mocked(await import('@langchain/langgraph/prebuilt')).createReactAgent.mock.results[0]?.value.invoke.mock.calls;
    expect(invokeCalls?.length).toBe(3);
    
    // Last call for conv2 should only have system message and one user message
    const lastCall = invokeCalls?.[2];
    expect(lastCall?.[0].messages).toHaveLength(2);
    expect(lastCall?.[0].messages[1].content).toBe('Hi there');
  });
}); 