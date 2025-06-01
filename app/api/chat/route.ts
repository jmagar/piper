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

// Import our logging system
import { aiSdkLogger, AiProvider, AiSdkOperation, StreamingState } from '@/lib/logger/ai-sdk-logger'
import { appLogger } from '@/lib/logger'
import { getCurrentCorrelationId } from '@/lib/logger/correlation'

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
    const operationId = aiSdkLogger.startOperation(
      AiProvider.OPENROUTER,
      model || 'anthropic/claude-3.5-sonnet',
      AiSdkOperation.STREAMING_START,
      {
        chatId,
        agentId,
        messageCount: messages.length,
        hasTools: !!toolsToUse,
        systemPromptLength: effectiveSystemPrompt.length
      }
    );

    let streamError: Error | null = null

    const result = streamText({
      model: openrouter.chat(model || 'anthropic/claude-3.5-sonnet'), // Use OpenRouter; defaults to claude-3.5-sonnet if no model specified
      system: effectiveSystemPrompt,
      messages,
      tools: toolsToUse as ToolSet,
      maxTokens: 8096, // Reasonable limit for response length while preserving quality
      maxSteps: 10,
      onError: (event: { error: unknown }) => {
        appLogger.aiSdk.error("🛑 streamText error (raw event.error):", event.error as Error, { correlationId });

        // Attempt to get more details from event.error
        let errorMessage = "AI generation failed. Please check your model or API key.";
        if (event.error instanceof Error) {
          errorMessage = event.error.message;
          appLogger.aiSdk.error("🛑 streamText error (event.error.message):", new Error(event.error.message), { correlationId });
          if (event.error.stack) {
            appLogger.aiSdk.error("🛑 streamText error (event.error.stack):", new Error(event.error.stack), { correlationId });
          }
        } else if (typeof event.error === 'object' && event.error !== null) {
          appLogger.aiSdk.error("🛑 streamText error (event.error as stringified object):", new Error(JSON.stringify(event.error, null, 2)), { correlationId });
          // Try to find a message property, or just stringify
          const errorObj = event.error as Record<string, unknown>;
          errorMessage = (typeof errorObj.message === 'string' ? errorObj.message : JSON.stringify(event.error));
        } else if (event.error !== undefined && event.error !== null) {
          errorMessage = String(event.error);
          appLogger.aiSdk.error("🛑 streamText error (event.error as string):", new Error(errorMessage), { correlationId });
        }
        
        streamError = new Error(errorMessage);
        
        // Log streaming error with AI SDK logger
        aiSdkLogger.logStreamingEvent(operationId, StreamingState.ERROR, {
          error: streamError,
          chunkSize: 0
        });
      },

      onFinish: async ({ response }) => {
        try {
          // Extract token usage from response metadata
          const usage = (response as { usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } }).usage || {};
          const tokenUsage = {
            promptTokens: usage.promptTokens || 0,
            completionTokens: usage.completionTokens || 0,
            totalTokens: usage.totalTokens || 0
          };

          appLogger.aiSdk.info('AI SDK completion finished', {
            correlationId,
            tokenUsage,
            responseMessageCount: response.messages.length
          });

          // End AI operation with token usage
          aiSdkLogger.endOperation(operationId, {
            tokenUsage,
            response: response.messages
          });

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
          appLogger.aiSdk.error('Error in onFinish callback:', error as Error, { correlationId });
          // End operation with error
          aiSdkLogger.endOperation(operationId, {
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      },
    })

    // Log streaming start
    aiSdkLogger.logStreamingEvent(operationId, StreamingState.STARTED);

    // Note: Removed consumeStream() call to enable proper streaming
    // The stream will be consumed by the client as chunks arrive

    if (streamError) {
      appLogger.aiSdk.error('Stream error occurred during consumption', streamError, { correlationId });
      throw streamError
    }

    // Log streaming completion (will be called by onFinish callback)
    // aiSdkLogger.logStreamingEvent(operationId, StreamingState.COMPLETED, {
    //   totalChunks: chunkCount,
    //   chunkSize: totalStreamSize
    // });

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
    const errorMessage = err instanceof Error ? err.message : "Internal server error"
    
    appLogger.http.error("Error in /api/chat:", err as Error, { correlationId })
    appLogger.aiSdk.error("Chat completion failed:", err as Error, { correlationId })
    
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
