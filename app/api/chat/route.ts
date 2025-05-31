import 'dotenv/config'; // Ensure .env variables are loaded using ES module syntax

import { loadAgent } from "@/lib/agents/load-agent"
import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { loadMCPToolsFromURL } from "@/lib/mcp/load-mcp-from-url";
import { getCombinedMCPToolsForAISDK } from "@/lib/mcp/mcpManager";
// import { MODELS } from "@/lib/models" // Removed unused import
import { Attachment } from "@ai-sdk/ui-utils"
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  Message as MessageAISDK,
  streamText,
  ToolSet,
} from "ai"
import { prisma } from "@/lib/prisma"; 
import {
  logUserMessage,
  storeAssistantMessage,
  trackSpecialAgentUsage,
  validateAndTrackUsage,
} from "./api"

// Import our logging system (temporarily disabled)
// import { aiSdkLogger, AiProvider, AiSdkOperation, StreamingState } from '@/lib/logger/ai-sdk-logger'
// import { getCurrentCorrelationId } from '@/lib/logger/correlation'

// Using simple console logging instead of complex logger system
const appLogger = {
  aiSdk: {
    info: (message: string, metadata?: Record<string, unknown>) => console.log(`[AI SDK INFO] ${message}`, metadata),
    error: (message: string, error?: Error, metadata?: Record<string, unknown>) => console.error(`[AI SDK ERROR] ${message}`, error, metadata),
    debug: (message: string, metadata?: Record<string, unknown>) => console.log(`[AI SDK DEBUG] ${message}`, metadata),
    warn: (message: string, error?: Error, metadata?: Record<string, unknown>) => console.warn(`[AI SDK WARN] ${message}`, error, metadata),
  },
  http: {
    info: (message: string, metadata?: Record<string, unknown>) => console.log(`[HTTP INFO] ${message}`, metadata),
    error: (message: string, error?: Error, metadata?: Record<string, unknown>) => console.error(`[HTTP ERROR] ${message}`, error, metadata),
    warn: (message: string, metadata?: Record<string, unknown>) => console.warn(`[HTTP WARN] ${message}`, metadata),
  }
};

// Simple replacements for logging system
const getCurrentCorrelationId = () => Math.random().toString(36).substr(2, 9);

// Simple AI SDK logger replacement
const aiSdkLogger = {
  startOperation: () => Math.random().toString(36).substr(2, 9),
  endOperation: () => {},
  logStreamingEvent: () => {},
};

export const maxDuration = 60

type ChatRequest = {
  messages: MessageAISDK[]
  chatId: string
  model: string
  systemPrompt: string
  agentId?: string
}

export async function POST(req: Request) {
  const correlationId = getCurrentCorrelationId();
  appLogger.http.info('Chat API request received', { correlationId });

  try {
    const {
      messages,
      chatId,
      model,
      systemPrompt,
      agentId,
    } = (await req.json()) as ChatRequest

    if (!messages || !chatId) {
      appLogger.http.warn('Chat API request missing required fields', { 
        correlationId,
        hasMessages: !!messages,
        hasChatId: !!chatId 
      });
      return new Response(
        JSON.stringify({ error: "Error, missing information" }),
        { status: 400 }
      )
    }

    // Log chat operation start
    appLogger.aiSdk.info('Starting chat completion', {
      correlationId,
      chatId,
      model: model || 'anthropic/claude-3.5-sonnet',
      messageCount: messages.length,
      hasAgent: !!agentId
    });

    // Ensure the Chat record exists for this chatId
    const firstUserMessageContent = messages.find(m => m.role === 'user')?.content || "New Chat";
    const defaultTitle = typeof firstUserMessageContent === 'string' 
      ? firstUserMessageContent.substring(0, 100) 
      : "New Chat";

    await prisma.chat.upsert({
      where: { id: chatId },
      update: { updatedAt: new Date() }, 
      create: {
        id: chatId,
        title: defaultTitle, 
        model: model,             
        systemPrompt: systemPrompt, 
        agentId: agentId,         
      },
    });
    appLogger.aiSdk.info(`✅ Ensured chat exists or created: ${chatId} with title "${defaultTitle}"`, { correlationId });

    // Validate request (simplified for admin-only mode)
    await validateAndTrackUsage()

    const userMessage = messages[messages.length - 1]

    if (userMessage?.role === "user") {
      await logUserMessage({
        chatId,
        content: userMessage.content,
        attachments: userMessage.experimental_attachments as Attachment[],
      })
    }

    let agentConfig = null

    if (agentId) {
      agentConfig = await loadAgent(agentId)
      appLogger.aiSdk.debug('Loaded agent configuration', { 
        correlationId, 
        agentId, 
        hasSystemPrompt: !!agentConfig?.systemPrompt 
      });
    }

    // Initialize OpenRouter provider
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY, // Reverted to use environment variable
    });

    const effectiveSystemPrompt =
      agentConfig?.systemPrompt || systemPrompt || SYSTEM_PROMPT_DEFAULT

    let toolsToUse = undefined

    if (agentConfig?.mcpConfig) {
      const mcpConfig = agentConfig.mcpConfig as { server?: string }
      if (mcpConfig.server) {
        const { tools } = await loadMCPToolsFromURL(mcpConfig.server)
        toolsToUse = tools
      }
    } else if (agentConfig?.tools) {
      toolsToUse = agentConfig.tools
      await trackSpecialAgentUsage()
    } else {
      // If no agent-specific tools, use general MCP tools
      const generalMcpTools = await getCombinedMCPToolsForAISDK();
      if (Object.keys(generalMcpTools).length > 0) {
        toolsToUse = generalMcpTools;
        console.log(`[Chat API] Using ${Object.keys(generalMcpTools).length} general MCP tools.`);
      } else {
        console.log('[Chat API] No general MCP tools available or returned empty.');
      }
    }

    // Start AI SDK operation logging
    aiSdkLogger.startOperation();

    let streamError: Error | null = null

    const result = streamText({
      model: openrouter.chat(model || 'anthropic/claude-3.5-sonnet'), // Use OpenRouter; defaults to claude-3.5-sonnet if no model specified
      system: effectiveSystemPrompt,
      messages,
      tools: toolsToUse as ToolSet,
      maxTokens: 8096, // Reasonable limit for response length while preserving quality
      maxSteps: 10,
      onError: (event: { error: unknown }) => {
        const error = event.error instanceof Error ? event.error : new Error(String(event.error));
        appLogger.aiSdk.error("🛑 streamText error:", error, { correlationId });
        
        streamError = error;
        
        // Log streaming error with AI SDK logger
        aiSdkLogger.logStreamingEvent();
      },

      onFinish: async ({ response }) => {
        try {
          appLogger.aiSdk.info('AI SDK completion finished', {
            correlationId,
            responseMessageCount: response.messages.length
          });

          // End AI operation
          aiSdkLogger.endOperation();

          // Convert ResponseMessage[] to simple message format
          const simpleMessages = response.messages
            .filter(msg => msg.role === 'assistant')
            .map(msg => ({
              role: msg.role,
              content: typeof msg.content === 'string' 
                ? msg.content 
                : Array.isArray(msg.content) 
                  ? msg.content.map(part => 
                      part.type === 'text' ? part.text : ''
                    ).join('')
                  : ''
            }))

          await storeAssistantMessage({
            chatId,
            messages: simpleMessages,
          })
          
          appLogger.aiSdk.info('Assistant messages stored successfully', { correlationId, chatId });
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          appLogger.aiSdk.error('Error in onFinish callback:', err, { correlationId });
          // End operation with error
          aiSdkLogger.endOperation();
        }
      },
    })

    // Log streaming start
    aiSdkLogger.logStreamingEvent();

    await result.consumeStream()

    if (streamError) {
      appLogger.aiSdk.error('Stream error occurred during consumption', streamError, { correlationId });
      throw streamError
    }

    // Log streaming completion
    aiSdkLogger.logStreamingEvent();

    const originalResponse = result.toDataStreamResponse({
      sendReasoning: true,
      sendSources: true,
    })
    
    // Optionally attach chatId in a custom header.
    const headers = new Headers(originalResponse.headers)
    headers.set("X-Chat-Id", chatId)
    headers.set("X-Correlation-Id", correlationId || '')

    appLogger.http.info('Chat API request completed successfully', { 
      correlationId, 
      chatId,
      status: originalResponse.status
    });

    return new Response(originalResponse.body, {
      status: originalResponse.status,
      headers,
    })
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    const errorMessage = error.message;
    
    appLogger.http.error("Error in /api/chat:", error, { correlationId })
    appLogger.aiSdk.error("Chat completion failed:", error, { correlationId })
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-Id': correlationId || ''
        }
      }
    )
  }
}
