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

export const maxDuration = 60

type ChatRequest = {
  messages: MessageAISDK[]
  chatId: string
  model: string
  systemPrompt: string
  agentId?: string
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      chatId,
      model,
      systemPrompt,
      agentId,
    } = (await req.json()) as ChatRequest

    if (!messages || !chatId) {
      return new Response(
        JSON.stringify({ error: "Error, missing information" }),
        { status: 400 }
      )
    }

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
    console.log(`✅ Ensured chat exists or created: ${chatId} with title "${defaultTitle}"`);

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

    let streamError: Error | null = null

    const result = streamText({
      model: openrouter.chat(model || 'anthropic/claude-3.5-sonnet'), // Use OpenRouter; defaults to claude-3.5-sonnet if no model specified
      system: effectiveSystemPrompt,
      messages,
      tools: toolsToUse as ToolSet,
      // @todo: remove this
      // hardcoded for now
      maxSteps: 10,
      onError: (event: { error: unknown }) => {
        console.error("🛑 streamText error (raw event.error):", event.error); // Existing log

        // Attempt to get more details from event.error
        let errorMessage = "AI generation failed. Please check your model or API key.";
        if (event.error instanceof Error) {
          errorMessage = event.error.message;
          console.error("🛑 streamText error (event.error.message):", event.error.message);
          if (event.error.stack) {
            console.error("🛑 streamText error (event.error.stack):", event.error.stack);
          }
        } else if (typeof event.error === 'object' && event.error !== null) {
          console.error("🛑 streamText error (event.error as stringified object):", JSON.stringify(event.error, null, 2));
          // Try to find a message property, or just stringify
          const errorObj = event.error as Record<string, unknown>;
          errorMessage = (typeof errorObj.message === 'string' ? errorObj.message : JSON.stringify(event.error));
        } else if (event.error !== undefined && event.error !== null) {
          errorMessage = String(event.error);
          console.error("🛑 streamText error (event.error as string):", errorMessage);
        }
        
        streamError = new Error(errorMessage);
      },


      onFinish: async ({ response }) => {
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
      },
    })

    await result.consumeStream()

    if (streamError) {
      throw streamError
    }

    const originalResponse = result.toDataStreamResponse({
      sendReasoning: true,
      sendSources: true,
    })
    // Optionally attach chatId in a custom header.
    const headers = new Headers(originalResponse.headers)
    headers.set("X-Chat-Id", chatId)

    return new Response(originalResponse.body, {
      status: originalResponse.status,
      headers,
    })
  } catch (err: unknown) {
    console.error("Error in /api/chat:", err)
    
    const errorMessage = err instanceof Error ? err.message : "Internal server error"
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    )
  }
}
