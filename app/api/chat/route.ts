import 'dotenv/config'; // Ensure .env variables are loaded using ES module syntax

import { loadAgent } from "@/lib/agents/load-agent"
import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { loadMCPToolsFromURL } from "@/lib/mcp/load-mcp-from-url";
import { getCombinedMCPToolsForAISDK } from "@/lib/mcp/mcpManager";
// import { MODELS } from "@/lib/models" // Removed unused import
import { Attachment } from "@ai-sdk/ui-utils"
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  UIMessage as MessageAISDK,
  streamText,
  ToolSet,
  convertToCoreMessages,
  type CoreMessage
} from "ai";
import { prisma } from "@/lib/prisma"; 
import {
  logUserMessage,
  storeAssistantMessage,
  trackSpecialAgentUsage,
  validateAndTrackUsage,
} from "./api"

export const maxDuration = 60

// Helper function to extract text from UIMessage parts
function extractTextFromUIMessage(message: MessageAISDK | undefined): string {
  if (!message || !message.parts) return "";
  const textPart = message.parts.find(part => part.type === 'text') as ({ type: 'text', value: string } | undefined);
  return textPart && typeof textPart.value === 'string' ? textPart.value : "";
}

// Helper function to extract attachments from UIMessage parts
function extractAttachmentsFromUIMessage(message: MessageAISDK | undefined): Attachment[] {
  if (!message || !message.parts) return [];
  const attachments: Attachment[] = [];

  for (const part of message.parts) {
    // Check if the part is a FileUIPart
    if (part.type === 'file') {
      // The AI SDK defines FileUIPart with top-level url, mediaType, and optional filename
      // Ensure these properties exist and url is a string.
      const filePart = part as { type: 'file'; mediaType: string; url: string; filename?: string };

      if (typeof filePart.url === 'string' && typeof filePart.mediaType === 'string') {
        const name = filePart.filename || (filePart.mediaType.startsWith('image/') ? 'image_attachment' : 'file_attachment');
        const contentType = filePart.mediaType;
        attachments.push({ name, contentType, url: filePart.url });
      }
    }
  }
  return attachments.filter(att => att.url);
}



export async function POST(req: Request) {
  try {
    const { messages, data }: { messages: MessageAISDK[]; data?: any } = await req.json();

    if (!messages || !data?.chatId) {
      return new Response(
        JSON.stringify({ error: "Error, missing information" }),
        { status: 400 }
      )
    }

    // Ensure the Chat record exists for this chatId
    const firstUserMessageText = extractTextFromUIMessage(messages.find(m => m.role === 'user')) || "New Chat";
    const defaultTitle = firstUserMessageText.substring(0, 100);

    await prisma.chat.upsert({
      where: { id: data.chatId },
      update: { updatedAt: new Date() }, 
      create: {
        id: data.chatId,
        title: defaultTitle, 
        model: data.model,             
        systemPrompt: data.systemPrompt, 
        agentId: data.agentId,         
      },
    });
    console.log(`✅ Ensured chat exists or created: ${data.chatId} with title "${defaultTitle}"`);

    // Validate request (simplified for admin-only mode)
    await validateAndTrackUsage()

    const userMessage = messages[messages.length - 1]

    if (userMessage?.role === "user") {
      await logUserMessage({
        chatId: data.chatId,
        content: extractTextFromUIMessage(userMessage),
        attachments: extractAttachmentsFromUIMessage(userMessage),
      })
    }

    let agentConfig = null

    if (data.agentId) {
      agentConfig = await loadAgent(data.agentId)
    }

    // Initialize OpenRouter provider
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY, // Reverted to use environment variable
    });

    const effectiveSystemPrompt =
      agentConfig?.systemPrompt || data.systemPrompt || SYSTEM_PROMPT_DEFAULT

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
      model: openrouter.chat(data.model || 'anthropic/claude-3.5-sonnet') as any, // TODO: Fix this type error, OpenRouter model may not be compatible with LanguageModelV2
      system: effectiveSystemPrompt,
      messages: convertToCoreMessages(messages) as CoreMessage[], // Convert UIMessage[] to ModelMessage[]
      tools: toolsToUse as ToolSet,
      // maxTokens: 8096, // Removed for now, check SDK v5 docs for correct placement
      // maxSteps: 10, // Commented out for now, check SDK v5 docs for correct placement
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
          chatId: data.chatId,
          messages: simpleMessages,
        })
      },
    })

    await result.consumeStream()

    if (streamError) {
      throw streamError
    }

    return result.toUIMessageStreamResponse()
    // TODO: Check AI SDK v5 docs for how to send reasoning/sources with toTextStreamResponse if needed
    // Optionally attach chatId in a custom header.
    const response = result.toUIMessageStreamResponse();
    // Optionally attach chatId in a custom header if needed by client, but usually not necessary with UIMessageStreamResponse
    // response.headers.set("X-Chat-Id", data.chatId);
    return response;
  } catch (err: unknown) {
    console.error("Error in /api/chat:", err)
    
    const errorMessage = err instanceof Error ? err.message : "Internal server error"
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    )
  }
}
