import { prisma } from "@/lib/prisma"

type ContentPart = {
  type: string
  text?: string
  toolCallId?: string
  toolName?: string
  args?: unknown
  result?: unknown
  toolInvocation?: {
    state: string
    step: number
    toolCallId: string
    toolName: string
    args?: unknown
    result?: unknown
  }
  reasoning?: string
  details?: unknown[]
}

// Define a more specific type for toolCalls instead of any
type ToolCall = {
  id: string
  name: string
  args: Record<string, unknown>
  result?: unknown
}

interface SaveMessageParams {
  chatId: string;
  messageId: string;
  role: 'assistant'; // Assuming it's always assistant for this function
  content: string | null | ContentPart[];
  toolCalls?: ToolCall[];
  model?: string;
  agentId?: string;
  userId?: string;
  operationId?: string;
  correlationId?: string;
}

export async function saveFinalAssistantMessage(params: SaveMessageParams) {
  const { chatId, messageId, role, content, toolCalls, model, agentId, userId, operationId, correlationId } = params;

  let finalPlainText = "";
  const processedParts: ContentPart[] = [];
  const toolMap = new Map<string, ToolCall>();

  // Build tool map from toolCalls parameter
  if (toolCalls && toolCalls.length > 0) {
    toolCalls.forEach(toolCall => {
      toolMap.set(toolCall.id, toolCall);
    });
  }

  // Process content properly
  if (typeof content === 'string') {
    finalPlainText = content;
    if (content.trim()) {
      processedParts.push({ type: 'text', text: content });
    }
  } else if (Array.isArray(content)) {
    content.forEach(part => {
      if (part.type === 'text' && part.text) {
        finalPlainText += (finalPlainText ? "\n\n" : "") + part.text;
        processedParts.push(part);
      } else if (part.type === 'tool-call' && part.toolCallId && part.toolName) {
        // Handle tool call parts
        const toolCall = toolMap.get(part.toolCallId);
        const processedToolCall: ContentPart = {
          type: 'tool-call',
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          args: part.args || toolCall?.args,
          result: toolCall?.result
        };
        processedParts.push(processedToolCall);
      } else if (part.type === 'tool-result' && part.toolCallId) {
        // Handle tool result parts
        const processedResult: ContentPart = {
          type: 'tool-result',
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          result: part.result
        };
        processedParts.push(processedResult);
      } else if (part.type === 'tool-invocation' || part.type === 'reasoning' || part.type === 'step-start') {
        // Handle other specialized part types
        processedParts.push(part);
      }
    });
  } else if (content === null || content === undefined) {
    finalPlainText = "";
  }

  // Add any tool calls not already processed in content
  if (toolCalls) {
    toolCalls.forEach(toolCall => {
      const alreadyProcessed = processedParts.some(
        part => part.type === 'tool-call' && part.toolCallId === toolCall.id
      );
      
      if (!alreadyProcessed) {
        processedParts.push({
          type: 'tool-call',
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          args: toolCall.args,
          result: toolCall.result
        });
      }
    });
  }

  try {
    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx: any) => {
      await tx.message.create({
        data: {
          id: messageId,
          chatId: chatId,
          role: role,
          content: finalPlainText || "",
          parts: processedParts.length > 0 ? processedParts : undefined,
          userId: userId || null,
        }
      });

      // Update chat timestamp
      await tx.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() }
      });
    });
    
    console.log("Assistant message saved successfully with parts:", processedParts.length, {
      operationId,
      correlationId,
      model,
      agentId
    });
  } catch (error) {
    console.error("Error saving final assistant message:", error);
    throw new Error(`Failed to save assistant message: ${error instanceof Error ? error.message : String(error)}`);
  }
}
