import 'dotenv/config';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  streamText,
  TextPart,
  CoreMessage,
  ImagePart,
  ToolCallPart
} from 'ai';
import { prisma } from "@/lib/prisma";
import { logUserMessage, validateAndTrackUsage } from "./api";
import { aiSdkLogger, AiProvider, AiSdkOperation } from '@/lib/logger/ai-sdk-logger';
import { appLogger, LogSource, LogLevel } from '@/lib/logger';
import { getCurrentCorrelationId } from '@/lib/logger/correlation';
import { orchestrateChatProcessing, ChatRequest } from './lib/chat-orchestration';
import { TOKEN_CONFIG } from './lib/token-management';

export const maxDuration = 60;

const messageSchema = z.object({
  id: z.string().optional(), // ID is optional from client, will be generated if missing
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  name: z.string().optional(), // For tool role messages, used as toolName in ToolResultPart
  tool_call_id: z.string().optional(), // For tool role messages, used as toolCallId in ToolResultPart
  tool_calls: z.array( // For assistant messages that include tool calls
    z.object({
      id: z.string(), // This will be toolCallId for ToolCallPart
      type: z.literal('function'), // Assuming always 'function' from current use
      function: z.object({
        name: z.string(), // This will be toolName for ToolCallPart
        arguments: z.string(), // This will be args for ToolCallPart (after JSON.parse)
      }),
    })
  ).optional(),
  experimental_attachments: z.array(
    z.object({
      contentType: z.string().optional(),
      name: z.string().optional(),
      url: z.string(),
      size: z.number().optional(),
    })
  ).optional(), // For user messages with attachments
});

const ChatRequestSchema = z.object({
  messages: z.array(messageSchema),
  chatId: z.string().optional(),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  agentId: z.string().optional(),
  userId: z.string().optional(),
  user: z.any().optional(),
  operationId: z.string().optional(),
});

// Define PiperMessage type based on Zod schema for clarity
type PiperMessage = z.infer<typeof messageSchema>;

function transformPiperMessagesToCoreMessages(piperMessages: PiperMessage[]): CoreMessage[] {
  return piperMessages.map((piperMsg): CoreMessage => {
    switch (piperMsg.role) {
      case 'user':
        const userContent: Array<TextPart | ImagePart> = [];
        if (piperMsg.content && piperMsg.content.trim() !== '') {
          userContent.push({ type: 'text', text: piperMsg.content });
        }
        if (piperMsg.experimental_attachments) {
          piperMsg.experimental_attachments.forEach(att => {
            if (att.url && att.contentType) {
              if (att.contentType.startsWith('image/')) {
                // Check if it's a data URL (from frontend upload) or a standard URL (from file mention)
                if (att.url.startsWith('data:')) {
                  // It's a data URL, pass it as a string.
                  userContent.push({ type: 'image', image: att.url });
                } else {
                  // It's a standard URL, parse it into a URL object.
                  try {
                    userContent.push({ type: 'image', image: new URL(att.url) });
                  } catch (e) {
                    appLogger.warn('Invalid standard URL for image attachment, processed as text', { url: att.url, error: e });
                    userContent.push({ type: 'text', text: `[Image with invalid URL: ${att.name || att.url}]` });
                  }
                }
              } else {
                // For non-image attachments, represent them as text links.
                userContent.push({ type: 'text', text: `[Attached File (${att.contentType}): ${att.name || att.url}]` });
                appLogger.info(`Attachment URL processed as text link: ${att.url}`);
              }
            }
          });
        }
        // Ensure content is never truly empty before returning
        if (userContent.length === 0) {
          userContent.push({ type: 'text', text: '(Image attachment)' }); // Fallback for truly empty content
        }
        return { role: 'user', content: userContent.length === 1 && userContent[0].type === 'text' ? userContent[0].text : userContent };
      case 'assistant':
        const assistantContentParts: Array<TextPart | ToolCallPart> = [];
        // Add base text content if it exists
        if (piperMsg.content && piperMsg.content.trim() !== '') {
            assistantContentParts.push({ type: 'text', text: piperMsg.content });
        }

        if (piperMsg.tool_calls && piperMsg.tool_calls.length > 0) {
          piperMsg.tool_calls.forEach(tc => {
            try {
              assistantContentParts.push({
                type: 'tool-call',
                toolCallId: tc.id,
                toolName: tc.function.name,
                args: JSON.parse(tc.function.arguments), // Args must be an object
              });
            } catch (e) {
              appLogger.error('Failed to parse tool call arguments', { toolCallId: tc.id, args: tc.function.arguments, error: e });
              // Optionally add a text representation of the failed tool call
              assistantContentParts.push({ type: 'text', text: `[Failed to process tool call: ${tc.function.name}]` });
            }
          });
        }
        // If only text content and it's empty, but there are tool_calls, content should be the array of tool_calls
        // If no tool_calls and content is empty string, it's an empty assistant message (content: '')
        // If content has only one part and it's text, it can be a string.
        let finalAssistantContent: string | Array<TextPart | ToolCallPart> = assistantContentParts;
        if (assistantContentParts.length === 0 && (!piperMsg.content || piperMsg.content.trim() === '')) {
            finalAssistantContent = ''; // Empty assistant message
        } else if (assistantContentParts.length === 1 && assistantContentParts[0].type === 'text') {
            finalAssistantContent = assistantContentParts[0].text;
        }

        return {
          role: 'assistant',
          content: finalAssistantContent,
        };
      case 'tool':
        let toolCallId = piperMsg.tool_call_id;
        let toolName = piperMsg.name;
        if (!toolCallId || !toolName) {
          appLogger.error('Tool message missing tool_call_id or tool_name (piperMsg.name). Using fallbacks.', { 
            messageId: piperMsg.id, 
            originalToolCallId: piperMsg.tool_call_id,
            originalToolName: piperMsg.name 
          });
          toolCallId = toolCallId || 'unknown_tool_call_id';
          toolName = toolName || 'unknown_tool_name';
        }
        return {
          role: 'tool', // Corrected based on this SDK version's CoreToolMessage type
          content: [{
            type: 'tool-result',
            toolCallId: toolCallId,
            toolName: toolName,
            result: piperMsg.content, // Zod schema defines content as string for tool message
          }],
        };
      case 'system':
        return {
          role: 'system',
          content: piperMsg.content,
        };
      default:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        appLogger.error('Unknown message role during transformation', { role: (piperMsg as any).role });
        // This case should ideally be prevented by Zod validation upstream
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new Error(`Unknown message role: ${(piperMsg as any).role}`);
    }
  });
}



export async function POST(req: Request) {
  const correlationId = getCurrentCorrelationId();
  appLogger.logSource(LogSource.HTTP, LogLevel.INFO, 'Chat API request received', { correlationId });

  try {
    const requestBody = await req.json();
    const validatedRequest = ChatRequestSchema.safeParse(requestBody);

    if (!validatedRequest.success) {
      appLogger.logSource(LogSource.HTTP, LogLevel.WARN, 'Chat API request validation failed', {
        correlationId,
        error: validatedRequest.error.flatten(),
      });
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          errors: validatedRequest.error.flatten(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Ensure messages have IDs after successful validation
    const piperMessagesWithInitialIds = validatedRequest.data.messages.map(message => ({
      ...message,
      id: message.id || uuidv4(),
    })) as PiperMessage[]; // Cast to PiperMessage[]

    const {
      chatId: rawChatId,
      model,
      systemPrompt,
      userId,
      // user, // user object from validatedRequest.data is not directly used further, so commented out to avoid unused var
      agentId,
      operationId: reqOpId,
    } = validatedRequest.data;

    const chatId = rawChatId || uuidv4(); // Ensure chatId is always present
    const operationId = reqOpId || uuidv4(); // Use provided operationId or generate new
    
    appLogger.info(`[POST /api/chat] Received validated request. ChatID: ${chatId}, OperationID: ${operationId}. Messages (brief):`, {
      correlationId,
      chatId,
      operationId,
      messageCount: piperMessagesWithInitialIds.length,
      model: model,
      userId: userId,
      agentIdFromRequest: agentId
    });

    const effectiveModel = model || 'anthropic/claude-3.5-sonnet';

    const firstUserMessageContent = piperMessagesWithInitialIds.find(m => m.role === 'user')?.content || "New Chat";
    const defaultTitle = typeof firstUserMessageContent === 'string'
      ? firstUserMessageContent.substring(0, 100)
      : "New Chat";

    await prisma.chat.upsert({
      where: { id: chatId },
      update: { updatedAt: new Date() },
      create: {
        id: chatId,
        title: defaultTitle,
        model: effectiveModel,
        systemPrompt: systemPrompt || '',
        agentId: agentId,
      },
    });
    appLogger.logSource(LogSource.HTTP, LogLevel.INFO, `Chat upserted: ${chatId}`, { correlationId });

    await validateAndTrackUsage(); // Assuming this uses context or validatedRequest.data internally

    // Log PiperMessages before transforming to CoreMessages for orchestration
    appLogger.info(`[POST /api/chat] PiperMessages for orchestration (piperMessagesWithInitialIds). Attachments (first 50 chars + length):`, {
      correlationId,
      messages: piperMessagesWithInitialIds.map(m => ({
        id: m.id,
        role: m.role,
        content: typeof m.content === 'string' ? m.content.substring(0, 100) + (m.content.length > 100 ? '...' : '') : '[Non-string content]',
        experimental_attachments: m.experimental_attachments?.map(att => ({ contentType: att.contentType, name: att.name, url: att.url.substring(0,50) + (att.url.length > 50 ? '...' : ''), size: att.size }))
      }))
    });

    // Transform PiperMessages to CoreMessages for the orchestration step
    const coreMessagesForOrchestration = transformPiperMessagesToCoreMessages(piperMessagesWithInitialIds);

    // Convert CoreMessages to AI SDK Messages for orchestration (add IDs)
    const messagesForOrchestration = coreMessagesForOrchestration.map(msg => ({
      ...msg,
      id: uuidv4()
    }));

    const chatRequestPayload: ChatRequest = {
      chatId: chatId, 
      messages: messagesForOrchestration as ChatRequest['messages'], // Type assertion to match ChatRequest interface
      model: effectiveModel,
      systemPrompt: systemPrompt || '',
      agentId: agentId,
      userId: userId,
    };

    const {
      finalMessages: coreFinalMessagesForAIFromOrchestration,
      effectiveSystemPrompt,
      toolsToUse
    } = await orchestrateChatProcessing(chatRequestPayload);
    appLogger.logSource(LogSource.AI_SDK, LogLevel.INFO, 'Chat orchestration completed', { 
      correlationId, 
      messageCount: coreFinalMessagesForAIFromOrchestration.length, 
      hasTools: !!toolsToUse 
    });

    const originalLastUserMessage = piperMessagesWithInitialIds.filter((m) => m.role === 'user').pop();
    if (originalLastUserMessage) {
      try {
        await logUserMessage({
          chatId: chatId,
          userId: userId,
          content: originalLastUserMessage.content as string, // Assuming content is string here, adjust if it can be complex
          attachments: originalLastUserMessage.experimental_attachments,
        });
      } catch (logError) {
        appLogger.error('Failed to log user message to DB', { correlationId, error: logError });
      }
    }

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: process.env.OPENROUTER_BASE_URL || undefined,
    });

    const baseStreamConfig = {
      model: openrouter.chat(effectiveModel),
      system: effectiveSystemPrompt, // Can be an empty string if not provided
      messages: coreFinalMessagesForAIFromOrchestration,
      maxTokens: TOKEN_CONFIG.MAX_TOKENS,
    } as const;

    const streamTextConfig = toolsToUse && Object.keys(toolsToUse).length > 0
      ? { ...baseStreamConfig, tools: toolsToUse, maxSteps: TOKEN_CONFIG.MAX_STEPS, experimental_streamData: true }
      : { ...baseStreamConfig, experimental_streamData: true };

    const operationId_aiSdk = aiSdkLogger.startOperation(
      AiProvider.OPENROUTER,
      effectiveModel,
      AiSdkOperation.STREAMING_START,
      {
        chatId: chatId,
        agentId: agentId,
        messageCount: coreFinalMessagesForAIFromOrchestration.length,
        hasTools: !!toolsToUse,
        systemPromptLength: effectiveSystemPrompt?.length || 0,
        operationId: operationId,
        correlationId: correlationId,
      }
    );

    let streamError: Error | null = null;
    let result;
    
    try {
      result = await streamText(streamTextConfig);
    } catch (error) {
      streamError = error as Error;
      appLogger.logSource(LogSource.AI_SDK, LogLevel.ERROR, 'Error calling streamText', { 
        correlationId, 
        error: streamError,
        agentIdFromRequest: agentId,
        hasTools: !!toolsToUse
      });
      aiSdkLogger.endOperation(operationId_aiSdk, {
        error: streamError,
      });
      throw error;
    }

    if (streamError) {
      appLogger.logSource(LogSource.AI_SDK, LogLevel.ERROR, 'AI streamText call resulted in an error (pre-stream processing)', { correlationId, error: streamError });
      throw streamError;
    }

    appLogger.logSource(LogSource.AI_SDK, LogLevel.INFO, 'AI Stream started successfully', { correlationId });

    // Return the data stream response directly
    return result.toDataStreamResponse();

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    appLogger.logSource(LogSource.HTTP, LogLevel.ERROR, "Error in /api/chat:", { error: err as Error, correlationId });
    appLogger.logSource(LogSource.AI_SDK, LogLevel.ERROR, "Chat completion failed:", { error: err as Error, correlationId });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}