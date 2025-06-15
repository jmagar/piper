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
} from "ai";
import { prisma } from "@/lib/prisma";
import { logUserMessage, validateAndTrackUsage } from "./api";
import { saveFinalAssistantMessage } from "./db";
import { aiSdkLogger, AiProvider, AiSdkOperation, StreamingState } from '@/lib/logger/ai-sdk-logger';
import { appLogger } from '@/lib/logger';
import { getCurrentCorrelationId } from '@/lib/logger/correlation';
import { orchestrateChatProcessing } from './lib/chat-orchestration';
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
  appLogger.http.info('Chat API request received', { correlationId });

  try {
    const requestBody = await req.json();
    const validatedRequest = ChatRequestSchema.safeParse(requestBody);

    if (validatedRequest.success) {
      validatedRequest.data.messages = validatedRequest.data.messages.map(message => ({
        ...message,
        id: message.id || uuidv4(),
      }));
    }

    if (!validatedRequest.success) {
      appLogger.http.warn('Chat API request validation failed', {
        correlationId,
        errors: validatedRequest.error.flatten(),
      });
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          errors: validatedRequest.error.flatten(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const {
      messages,
      chatId,
      model,
      systemPrompt,
      userId,
      user,
      agentId,
      operationId: reqOpId,
    } = validatedRequest.data;

    const operationId = reqOpId || uuidv4(); // Use provided operationId or generate new
    appLogger.info(`[POST /api/chat] Received validated request body (PiperChatMessages). Attachments (first 50 chars + length):`, {
      correlationId,
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: typeof m.content === 'string' ? m.content.substring(0, 100) + (m.content.length > 100 ? '...' : '') : '[Non-string content]',
        experimental_attachments: m.experimental_attachments?.map(att => ({ contentType: att.contentType, name: att.name, content: typeof att.content === 'string' ? `${att.content.substring(0, 50)}[...len:${att.content.length}]` : `[type:${typeof att.content}]` }))
      }))
    });
    const effectiveModel = model || 'anthropic/claude-3.5-sonnet';

    appLogger.aiSdk.info('Starting chat completion', {
      correlationId,
      chatId,
      model: effectiveModel,
      messageCount: messages.length,
      hasAgent: !!agentId
    });

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
        model: effectiveModel,
        systemPrompt: systemPrompt || '',
        agentId: agentId,
      },
    });
    appLogger.aiSdk.info(`✅ Ensured chat exists or created: ${chatId}`, { correlationId });

    await validateAndTrackUsage();

    // Transform Piper messages from request body to CoreMessages for orchestration
    const coreMessagesForOrchestration = transformPiperMessagesToCoreMessages(requestBody.messages);
    appLogger.info(`[POST /api/chat] Messages after initial transformation to CoreMessages (before file/tool/prompt processing). Attachments (first 50 chars + length):`, {
      correlationId,
      coreMessages: coreMessagesForOrchestration.map(m => ({
        id: m.id,
        role: m.role,
        content: typeof m.content === 'string' ? m.content.substring(0,100) + (m.content.length > 100 ? '...' : '') : '[Non-string content]',
        experimental_attachments: m.experimental_attachments?.map(att => ({ contentType: att.contentType, name: att.name, content: typeof att.content === 'string' ? `${att.content.substring(0, 50)}[...len:${att.content.length}]` : `[type:${typeof att.content}]` }))
      }))
    });

    // orchestrateChatProcessing returns ProcessedChatData. This includes: { finalMessages: CoreMessage[], effectiveSystemPrompt: string, toolsToUse: ToolSet | undefined, ... }
    const { finalMessages: piperFinalMessages, effectiveSystemPrompt, toolsToUse } = await orchestrateChatProcessing({
      messages: coreMessagesForOrchestration,
      chatId: chatId ?? 'unknown_chat_id_orchestration',
      model: effectiveModel,
      userId: userId ?? 'unknown_user_id_orchestration',
      user,
      agentId: agentId ?? undefined, // orchestrateChatProcessing can handle undefined agentId
      operationId,
      correlationId,
      // systemPrompt: systemPrompt || '', // systemPrompt is derived within orchestrateChatProcessing
    });

    // Log the original user message from the request body
    const originalLastUserMessage = requestBody.messages.filter((m: PiperMessage) => m.role === 'user').pop();
    if (originalLastUserMessage) {
      try {
        await logUserMessage({
          chatId: chatId ?? 'unknown_chat_id',
          userId: userId ?? 'unknown_user_id',
          content: originalLastUserMessage.content, // PiperMessage content is string
          // attachments: originalLastUserMessage.experimental_attachments // TODO: If you need to log attachments, handle them here
        });
      } catch (dbError) {
        appLogger.aiSdk.error('Failed to log user message to DB', {
          correlationId,
          chatId,
          error: dbError,
        });
        // Optionally, log the logging error itself if appLogger could fail
        // console.error('[ChatAPI] CRITICAL: Failed to log user message with appLogger', dbError);
      }
    }

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    aiSdkLogger.startOperation(
      AiProvider.OPENROUTER,
      effectiveModel,
      AiSdkOperation.STREAMING_START,
      {
        chatId,
        agentId,
        messageCount: messages.length,
        hasTools: !!toolsToUse,
        systemPromptLength: effectiveSystemPrompt.length
      }
    );

    let streamError: Error | null = null;

    const baseStreamConfig = {
      model: openrouter.chat(effectiveModel),
      system: effectiveSystemPrompt,
      messages: piperFinalMessages, // piperFinalMessages is already CoreMessage[]
      maxTokens: TOKEN_CONFIG.MAX_TOKENS,
    } as const;

    const streamTextConfig = toolsToUse && Object.keys(toolsToUse).length > 0
      ? { ...baseStreamConfig, tools: toolsToUse, maxSteps: TOKEN_CONFIG.MAX_STEPS, experimental_streamData: true }
      : { ...baseStreamConfig, experimental_streamData: true };

    appLogger.info(`[POST /api/chat] Final CoreMessages payload (piperFinalMessages) being sent to AI. Attachments (first 50 chars + length):`, {
      correlationId,
      finalMessagesForAI: piperFinalMessages.map(m => ({
        id: m.id,
        role: m.role,
        content: typeof m.content === 'string' ? m.content.substring(0,100) + (m.content.length > 100 ? '...' : '') : (Array.isArray(m.content) ? m.content.map(p => p.type === 'text' ? {type: 'text', text: p.text.substring(0,50) + '...'} : {type: p.type, image_url: (p as any).image_url?.url?.substring(0,50) + '...'}) : '[Unknown content type]'),
        experimental_attachments: m.experimental_attachments?.map(att => ({ contentType: att.contentType, name: att.name, content: typeof att.content === 'string' ? `${att.content.substring(0, 50)}[...len:${att.content.length}]` : `[type:${typeof att.content}]` })),
        tool_calls: (m as any).tool_calls,
        tool_choice: (m as any).tool_choice,
      }))
    });
    const result = await streamText({
      ...streamTextConfig,
      onFinish: async ({ text, toolCalls, finishReason, usage }: { text?: string; toolCalls?: ToolCallPart[]; finishReason: string; usage: { completionTokens: number; promptTokens: number; totalTokens: number; } }) => {
        try { // Main try block for onFinish logic
          try {
            aiSdkLogger.logStreamingEvent(operationId, StreamingState.COMPLETED);
          } catch (logEventError) {
            console.error('[ChatAPI] CRITICAL: Failed to log StreamingState.COMPLETED', logEventError);
          }

          try {
            aiSdkLogger.endOperation(operationId, { tokenUsage: usage, response: { finishReason } });
          } catch (logEndOpError) {
            console.error('[ChatAPI] CRITICAL: Failed to log endOperation onFinish', logEndOpError);
          }

          const assistantMessageContentParts: Array<TextPart | ToolCallPart> = [];
          if (text) {
            assistantMessageContentParts.push({ type: 'text', text });
          }
          if (toolCalls && toolCalls.length > 0) {
            assistantMessageContentParts.push(...toolCalls);
          }

          if (assistantMessageContentParts.length > 0) {
            // Transform CoreMessage parts back to PiperMessage format for saving
            const piperMessageToSave: PiperMessage = {
              id: uuidv4(), // Generate a new ID for the assistant message
              role: 'assistant',
              content: text || '', // Default to empty string if no text
            };
            if (toolCalls && toolCalls.length > 0) {
              piperMessageToSave.tool_calls = toolCalls.map(tc => ({
                id: tc.toolCallId,
                type: 'function', // Assuming 'function' based on current schema
                function: {
                  name: tc.toolName,
                  arguments: JSON.stringify(tc.args), // Convert args back to string
                },
              }));
              // If there are tool_calls but no text, AI SDK might put structured tool_call info in text.
              // For Piper's DB, if there are tool_calls, the primary text content might be less relevant or empty.
              // If text is purely informational like "Okay, I will use the following tools:", it should be kept.
              // If text is a JSON representation of tool_calls (some models do this), it might be redundant.
              // For now, we keep text if it exists, and add tool_calls separately.
            }

            try {
              await saveFinalAssistantMessage(chatId ?? 'unknown_chat_id_onfinish', [piperMessageToSave]);
              appLogger.aiSdk.info('Assistant message stored successfully.', { correlationId, chatId });
            } catch (saveMsgError) {
              appLogger.aiSdk.error('Error saving final assistant message in onFinish', { correlationId, operationId, error: saveMsgError });
              if (!streamError) streamError = saveMsgError instanceof Error ? saveMsgError : new Error(String(saveMsgError));
            }
          } else {
            try {
              appLogger.aiSdk.info('No text or tool calls from assistant to save.', { correlationId, chatId });
            } catch (logInfoError) {
              console.error('[ChatAPI] CRITICAL: Failed to log info about no message to save', logInfoError);
            }
          }
        } catch (error) { // Catch any other unexpected error within onFinish logic
          appLogger.aiSdk.error('Outer error in onFinish callback', { correlationId, operationId, error });
          if (!streamError) streamError = error instanceof Error ? error : new Error(String(error));
        }
      },
      onError: (errorEvent: { error: Error | unknown }) => {
        const errorForCallback = errorEvent.error instanceof Error ? errorEvent.error : new Error(String(errorEvent.error));
        streamError = errorForCallback;
        try {
          aiSdkLogger.logStreamingEvent(operationId, StreamingState.ERROR, { error: errorForCallback });
        } catch (logEventError) {
          console.error('[ChatAPI] CRITICAL: Failed to log StreamingState.ERROR', logEventError);
        }
        try {
          aiSdkLogger.endOperation(operationId, { error: errorForCallback });
        } catch (logEndOpError) {
          console.error('[ChatAPI] CRITICAL: Failed to log endOperation onError', logEndOpError);
        }
        try {
          appLogger.error('[ChatAPI] Stream error reported by AI SDK:', { correlationId, error: errorForCallback.message, stack: errorForCallback.stack });
        } catch (logAppError) {
          console.error('[ChatAPI] CRITICAL: Failed to log stream error with appLogger', logAppError);
        }
      }
    });

    if (streamError) {
      throw streamError;
    }

    const originalResponse = result.toDataStreamResponse();
    const headers = new Headers(originalResponse.headers);
    headers.set("X-Chat-Id", chatId);
    headers.set("X-Correlation-Id", correlationId || uuidv4());

    appLogger.http.info('Chat API request completed successfully', {
      correlationId,
      chatId,
      status: originalResponse.status
    });

    return new Response(originalResponse.body, {
      status: originalResponse.status,
      headers,
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    appLogger.http.error("Error in /api/chat:", err as Error, { correlationId });
    appLogger.aiSdk.error("Chat completion failed:", err as Error, { correlationId });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}