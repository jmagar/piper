import 'dotenv/config';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  streamText,
  CoreMessage,
  Message as MessageAISDK,
  ToolCall,
  Tool,
  ImagePart,
  TextPart,
} from 'ai';

import { logUserMessage, validateAndTrackUsage } from "./api";
import { saveFinalAssistantMessage } from "./db";
import { aiSdkLogger, AiProvider, AiSdkOperation } from '@/lib/logger/ai-sdk-logger';
import { appLogger, ensureLoggerInitialization } from '@/lib/logger';
import { orchestrateChatProcessing, ProcessedChatData } from './lib/chat-orchestration';

export const maxDuration = 60;

const messageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  createdAt: z.date().optional(),
  tool_calls: z.array(z.any()).optional(),
  tool_call_id: z.string().optional(),
  name: z.string().optional(),
  experimental_attachments: z.array(z.any()).optional(),
});

type PiperMessage = z.infer<typeof messageSchema>;

const ChatRequestSchema = z.object({
  messages: z.array(messageSchema),
  chatId: z.string(),
  agentId: z.string(),
  userId: z.string(),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  operationId: z.string().optional(),
});

function transformPiperMessagesToCoreMessages(piperMessages: PiperMessage[]): CoreMessage[] {
  return piperMessages.map(piperMsg => {
    const id = piperMsg.id || uuidv4();
    const { role, content, tool_calls, tool_call_id, experimental_attachments, name } = piperMsg;

    switch (role) {
      case 'user': {
        const userContent: Array<TextPart | ImagePart> = [];
        if (content) {
          userContent.push({ type: 'text', text: content });
        }
        if (experimental_attachments) {
          experimental_attachments.forEach(att => {
            if (att.contentType?.startsWith('image/') && att.url) {
              try {
                const imageUrl = new URL(att.url);
                userContent.push({ type: 'image', image: imageUrl });
              } catch (e) {
                appLogger.warn('Invalid image URL in attachment, skipping', { url: att.url, error: e });
              }
            }
          });
        }
        return { id, role, content: userContent };
      }
      case 'assistant':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { id, role, content, tool_calls: tool_calls as ToolCall<string, any>[] | undefined };
      case 'tool':
        return {
          id,
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: tool_call_id || uuidv4(),
              toolName: name || 'unknown',
              result: content,
            },
          ],
        };
      case 'system':
        return { id, role, content };
      default:
        throw new Error(`Unknown message role: ${role}`);
    }
  });
}

export async function POST(req: Request) {
  await ensureLoggerInitialization();
  const correlationId = req.headers.get('X-Correlation-ID') || uuidv4();

  try {
    const validatedRequest = ChatRequestSchema.safeParse(await req.json());

    if (!validatedRequest.success) {
      return new Response(JSON.stringify({ error: 'Invalid request body', details: validatedRequest.error.flatten() }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { messages, chatId, agentId, model, systemPrompt, userId, operationId } = validatedRequest.data;
    const initialOperationId = operationId || uuidv4();

    await logUserMessage({ chatId, userId, content: messages[messages.length - 1].content, attachments: messages[messages.length - 1].experimental_attachments });

    const processedData: ProcessedChatData = await orchestrateChatProcessing({
      messages: messages as MessageAISDK[],
      chatId,
      model: model || '',
      systemPrompt: systemPrompt || '',
      agentId,
    });

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY || '',
    });

    const modelToUse = processedData.model;
    const providerModel = openrouter(modelToUse);

    aiSdkLogger.startOperation(AiProvider.OPENROUTER, modelToUse, AiSdkOperation.STREAMING_START, { chatId, agentId, userId, correlationId, operationId: initialOperationId });

    const result = await streamText({
      model: providerModel,
      messages: transformPiperMessagesToCoreMessages(processedData.finalMessages as PiperMessage[]),
      system: processedData.effectiveSystemPrompt,
      tools: processedData.toolsToUse as Record<string, Tool>,
      onFinish: async (event) => {
        const { usage, finishReason, text, toolCalls } = event;
        aiSdkLogger.endOperation(initialOperationId, {
          tokenUsage: {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          },
          response: text,
        });

        if (finishReason === 'stop' || finishReason === 'tool-calls') {
          const finalMessagesToSave = [];
          type AssistantContentPart = 
            | { type: 'text'; text: string }
            | { type: 'tool-invocation'; toolCallId: string; toolName: string; args: unknown };
          const assistantTurn = { role: 'assistant', content: [] as AssistantContentPart[] };
          if (text) {
            assistantTurn.content.push({ type: 'text', text });
          }
          if (toolCalls) {
            toolCalls.forEach(toolCall => {
              assistantTurn.content.push({
                type: 'tool-invocation',
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                args: toolCall.args,
              });
            });
          }
          finalMessagesToSave.push(assistantTurn);

          const toolResultMessages = processedData.finalMessages.filter(m => m.role === 'data');
          finalMessagesToSave.push(...toolResultMessages);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await saveFinalAssistantMessage(chatId, finalMessagesToSave as any[]);
        }

        await validateAndTrackUsage();
      }
    });

    return result.toDataStream();

  } catch (error) {
    const e = error as Error;
    appLogger.error('Error in chat route handler', { error: e.message, stack: e.stack, correlationId });

    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}