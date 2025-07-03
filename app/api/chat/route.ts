import 'dotenv/config';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  streamText,
  TextPart,
  CoreMessage,
  ImagePart,
  ToolCallPart,
} from 'ai';
import { prisma } from "@/lib/prisma";
import { logUserMessage, validateAndTrackUsage } from "./api";
import { saveFinalAssistantMessage } from "./db";
import { aiSdkLogger, AiProvider, AiSdkOperation, StreamingState } from '@/lib/logger/ai-sdk-logger';
import { appLogger, LogSource, LogLevel } from '@/lib/logger';
import { getCurrentCorrelationId } from '@/lib/logger/correlation';
import { orchestrateChatProcessing, ChatRequest } from './lib/chat-orchestration';
import { TOKEN_CONFIG } from './lib/token-management';
import { getProviderForModel } from '@/lib/openproviders/provider-map';
import type { SupportedModel } from '@/lib/openproviders/types';

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
  stream: z.boolean().optional().default(true),
});

// Define PiperMessage type based on Zod schema for clarity
type PiperMessage = z.infer<typeof messageSchema>;

/**
 * Enhanced error message generation for better user feedback
 * Provides specific, actionable error messages instead of generic ones
 */
function getDetailedErrorMessage(error: Error): string {
  const errorMessage = error.message.toLowerCase();
  
  // Token counting and encoding errors (our main fix target)
  if (errorMessage.includes('null pointer passed to rust') || 
      errorMessage.includes('tiktoken') || 
      errorMessage.includes('countTokens')) {
    return "Message processing failed due to encoding issues. This has been automatically reported and should be resolved soon. Please try rephrasing your message or try again in a few moments.";
  }
  
  // Rate limiting errors
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return "Rate limit exceeded. Please wait a moment and try again.";
  }
  
  // Authentication errors
  if (errorMessage.includes('unauthorized') || errorMessage.includes('invalid api key')) {
    return "Authentication error. Please check your API configuration or try again later.";
  }
  
  // Model-specific errors
  if (errorMessage.includes('model not found') || errorMessage.includes('invalid model')) {
    return "The selected AI model is currently unavailable. Please try selecting a different model.";
  }
  
  // Content filtering errors
  if (errorMessage.includes('content policy') || errorMessage.includes('safety') || errorMessage.includes('filtered')) {
    return "Your message was blocked by content safety filters. Please rephrase your request and try again.";
  }
  
  // Network/timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('network') || errorMessage.includes('connection')) {
    return "Network timeout occurred. Please check your connection and try again.";
  }
  
  // Context length errors
  if (errorMessage.includes('context length') || errorMessage.includes('token limit') || errorMessage.includes('too long')) {
    return "Your conversation is too long for the current model. Please start a new chat or try a model with a larger context window.";
  }
  
  // Tool/function calling errors
  if (errorMessage.includes('tool') || errorMessage.includes('function')) {
    return "Tool execution failed. Please try your request again or contact support if the issue persists.";
  }
  
  // Server errors
  if (errorMessage.includes('server error') || errorMessage.includes('internal error')) {
    return "Server error occurred. Our team has been notified. Please try again in a few moments.";
  }
  
  // Default fallback with more helpful guidance
  return "An unexpected error occurred. Please try again, and if the problem persists, try refreshing the page or starting a new conversation.";
}

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
  const requestStartTime = Date.now();
  
  appLogger.logSource(LogSource.HTTP, LogLevel.INFO, 'Chat API request received', { 
    correlationId
  });

  try {
    const requestBody = await req.json();
    const validatedRequest = ChatRequestSchema.safeParse(requestBody);

    if (!validatedRequest.success) {
      appLogger.logSource(LogSource.HTTP, LogLevel.WARN, 'Chat API request validation failed', {
        correlationId,
        error: validatedRequest.error.flatten()
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
    
    appLogger.debug(`[POST /api/chat] Received validated request. ChatID: ${chatId}, OperationID: ${operationId}. Messages: ${piperMessagesWithInitialIds.length}`, {
      correlationId,
      chatId,
      operationId,
      messageCount: piperMessagesWithInitialIds.length,
      model: model,
      userId: userId
    });

    const effectiveModel = model || process.env.DEFAULT_MODEL_ID || 'anthropic/claude-3.5-sonnet';
    const detectedProvider = getProviderForModel(effectiveModel as SupportedModel);
    
    appLogger.debug(`Model selection: ${effectiveModel} (provider: ${detectedProvider})`, {
      correlationId,
      model: effectiveModel
    });

    const firstUserMessageContent = piperMessagesWithInitialIds.find(m => m.role === 'user')?.content || "New Chat";
    const defaultTitle = typeof firstUserMessageContent === 'string'
      ? firstUserMessageContent.substring(0, 100)
      : "New Chat";

    const chatUpsertStartTime = Date.now();
    // Use a transaction for critical database writes to ensure data consistency.
    await prisma.$transaction([
      prisma.chat.upsert({
        where: { id: chatId },
        update: { updatedAt: new Date() },
        create: {
          id: chatId,
          title: defaultTitle,
          model: effectiveModel,
          systemPrompt: systemPrompt || '',
          agentId: agentId,
        },
      })
    ]);
    appLogger.debug(`Chat upserted: ${chatId} (${Date.now() - chatUpsertStartTime}ms)`, {
      correlationId,
      chatId
    });

    await validateAndTrackUsage();

    // Log PiperMessages before transforming to CoreMessages for orchestration
    appLogger.debug(`[POST /api/chat] Processing ${piperMessagesWithInitialIds.length} messages for orchestration`, {
      correlationId,
      messageCount: piperMessagesWithInitialIds.length
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

    const orchestrationStartTime = Date.now();
    const {
      finalMessages: coreFinalMessagesForAIFromOrchestration,
      effectiveSystemPrompt,
      toolsToUse
    } = await orchestrateChatProcessing(chatRequestPayload);
    
    const orchestrationDuration = Date.now() - orchestrationStartTime;
    appLogger.logSource(LogSource.AI_SDK, LogLevel.INFO, `Chat orchestration completed: ${coreFinalMessagesForAIFromOrchestration.length} messages, ${toolsToUse ? Object.keys(toolsToUse).length : 0} tools (${orchestrationDuration}ms)`, { 
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

    // Enhanced OpenRouter client initialization with detailed logging
    const openrouterStartTime = Date.now();
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const openrouterBaseUrl = process.env.OPENROUTER_BASE_URL;
    
    appLogger.debug(`Initializing OpenRouter client (API key: ${openrouterApiKey ? 'present' : 'missing'}, length: ${openrouterApiKey ? openrouterApiKey.length : 0})`, {
      correlationId
    });

    const openrouter = createOpenRouter({
      apiKey: openrouterApiKey || '',
      baseURL: openrouterBaseUrl || undefined,
    });
    
    const openrouterInitDuration = Date.now() - openrouterStartTime;
    appLogger.debug(`OpenRouter client initialized (${openrouterInitDuration}ms)`, {
      correlationId
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

    // Enhanced request logging with detailed tool information
    const toolCount = toolsToUse ? Object.keys(toolsToUse).length : 0;
    appLogger.debug(`Preparing streamText request: ${effectiveModel} (${detectedProvider}), ${coreFinalMessagesForAIFromOrchestration.length} messages, ${toolCount} tools`, {
      correlationId,
      model: effectiveModel,
      messageCount: coreFinalMessagesForAIFromOrchestration.length,
      hasTools: !!toolsToUse,
      toolCount
    });
    
    // CRITICAL DIAGNOSTIC: Log exactly what tools are being passed to AI SDK
    if (toolsToUse && toolCount > 0) {
      appLogger.info(`[ChatAPI] 🔧 Tools being passed to AI SDK:`, {
        correlationId,
        toolNames: Object.keys(toolsToUse),
        toolCount,
        streamTextConfig: {
          hasTools: 'tools' in streamTextConfig,
          hasMaxSteps: 'maxSteps' in streamTextConfig,
          configKeys: Object.keys(streamTextConfig)
        }
      });
    } else {
      appLogger.warn(`[ChatAPI] ⚠️ NO TOOLS being passed to AI SDK - assistant will claim no tool access`, {
        correlationId,
        toolsToUse: !!toolsToUse,
        toolCount,
        streamTextConfigHasTools: 'tools' in streamTextConfig
      });
    }

    // This variable will be used to track the AI SDK operation
    const operationId_aiSdk = aiSdkLogger.startOperation(
      AiProvider.OPENROUTER,
      effectiveModel,
      AiSdkOperation.STREAMING_START,
      {
        correlationId,
        chatId: chatId,
        hasTools: !!toolsToUse,
        messageCount: coreFinalMessagesForAIFromOrchestration.length,
        provider: detectedProvider,
        systemPromptLength: effectiveSystemPrompt.length,
        requestPreparationTime: Date.now() - requestStartTime
      }
    );

    try {
      appLogger.debug(`Initiating streamText call (operation: ${operationId_aiSdk})`, {
        correlationId,
        operationId: operationId_aiSdk
      });

      const streamStartTime = Date.now();
      const result = await streamText({
        ...streamTextConfig,
        onFinish: async (finishResult) => {
          try {
            const assistantMessageId = uuidv4();
            const finalText = await finishResult.text;
            const finalToolCalls = await finishResult.toolCalls;
            await saveFinalAssistantMessage({
              chatId: chatId!,
              messageId: assistantMessageId,
              role: 'assistant',
              content: finalText || '', // Ensure content is always a string
              toolCalls: finalToolCalls?.map((toolCall) => ({
                id: toolCall.toolCallId,
                name: toolCall.toolName,
                args: toolCall.args,
              })),
              model: effectiveModel,
              userId: userId,
              operationId: operationId_aiSdk,
              correlationId: correlationId
            });
            appLogger.info(`[ChatAPI] ✅ Assistant message saved to database`, {
              correlationId,
              chatId,
              messageId: assistantMessageId,
              textLength: finalText?.length || 0,
              toolCallsCount: finalToolCalls?.length || 0
            });
          } catch (error) {
            appLogger.error(`[ChatAPI] ❌ Failed to save assistant message to database`, {
              correlationId,
              chatId,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      });
      const streamInitDuration = Date.now() - streamStartTime;
      
      appLogger.logSource(LogSource.AI_SDK, LogLevel.INFO, `streamText call successful, creating response stream (${streamInitDuration}ms)`, {
        correlationId,
        operationId: operationId_aiSdk
      });

      // Log streaming events
      const streamingResponse = result.toDataStream();

      return new Response(streamingResponse, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Vercel-AI-Data-Stream': 'v1',
        },
      });
    } catch (error: unknown) {
      const streamError = error instanceof Error ? error : new Error(String(error));
      const streamErrorDuration = Date.now() - requestStartTime;
      
      appLogger.error(`[ChatAPI] streamText call failed catastrophically: ${streamError.message} (${streamErrorDuration}ms total)`, {
        correlationId,
        chatId,
        model: effectiveModel,
        error: streamError,
        operationId: operationId_aiSdk
      });

      // Log provider-specific error with context
      aiSdkLogger.logProviderError(
        AiProvider.OPENROUTER,
        effectiveModel,
        streamError,
        {
          operation: AiSdkOperation.STREAMING_START,
          requestData: {
            messageCount: coreFinalMessagesForAIFromOrchestration.length,
            hasTools: !!toolsToUse,
            provider: detectedProvider
          }
        }
      );

      // Log streaming error event
      aiSdkLogger.logStreamingEvent(operationId_aiSdk, StreamingState.ERROR, {
        error: streamError
      });

      aiSdkLogger.endOperation(operationId_aiSdk, { error: streamError });

      // Enhanced error handling with specific error messages
      const errorMessage = getDetailedErrorMessage(streamError);
      
      appLogger.logSource(LogSource.AI_SDK, LogLevel.ERROR, `Returning error stream to client: ${errorMessage}`, {
        correlationId,
        operationId: operationId_aiSdk
      });
      
      // Manually create a stream that sends a detailed error message to the client
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(`3:{"type":"error","data":"${errorMessage}"}`);
          controller.close();
        },
      });

      return new Response(errorStream, {
        status: 200, // Still 200 OK, but the stream itself contains the error
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Vercel-AI-Data-Stream': 'v1',
        },
      });
    }

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    const requestDuration = Date.now() - requestStartTime;
    
    appLogger.logSource(LogSource.HTTP, LogLevel.ERROR, `[ChatAPI] Unhandled API error: ${error.message} (${requestDuration}ms)`, {
      correlationId,
      error,
      stack: error.stack
    });
    
    return new Response(
      `Fatal error processing your request: ${error.message}. The error has been logged.`,
      { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }
}