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
  const { chatId, messageId, role, content } = params;
  // Note: toolCalls, model, agentId, userId, operationId, correlationId are available in params
  // but not used in current implementation - they're kept for future enhancement

  let finalPlainText = "";
  const processedParts: ContentPart[] = [];

  if (typeof content === 'string') {
    finalPlainText = content;
    if (content) {
      processedParts.push({ type: 'text', text: content });
    }
  } else if (Array.isArray(content)) {
    content.forEach(part => {
      if (part.type === 'text' && part.text) {
        finalPlainText += (finalPlainText ? "\n\n" : "") + part.text;
        processedParts.push(part);
      } else if (part.type === 'tool-invocation' || part.type === 'reasoning' || part.type === 'step-start') {
        // Placeholder: Add more sophisticated handling based on original logic
        processedParts.push(part);
      }
      // TODO: Integrate full logic for handling toolCalls from `params.toolCalls`
      // and merging them into processedParts similar to how `toolMap` was used.
    });
  } else {
    // Handle null content or other types if necessary
    finalPlainText = ""; // Ensure finalPlainText is initialized
  }
  // TODO: The original logic that iterated `messages` and populated `parts`, `toolMap`, and `textParts`
  // needs to be carefully adapted here to work from `params.content` and `params.toolCalls`.
  // The current simplified version above is NOT a complete replacement for that logic.

  try {
    await prisma.message.create({
      data: {
        id: messageId, // Use the passed messageId
        chatId: chatId,
        role: role, // Use the passed role
        content: finalPlainText || "", // Ensure content is string or handle null appropriately
        parts: processedParts.length > 0 ? JSON.parse(JSON.stringify(processedParts)) : undefined,
        // userId: userId, // Save userId - Prisma schema needs update
        // agentId: agentId, // Save agentId - Prisma schema needs update
        // model: model, // Save model - Prisma schema needs update
        // operationId and correlationId are not typically direct fields on Message model
        // but could be logged or stored in a related table if needed.
      }
    })
    
    console.log("Assistant message saved successfully with parts:", processedParts.length)
  } catch (error) {
    console.error("Error saving final assistant message:", error)
    throw new Error(`Failed to save assistant message: ${error}`)
  }
}
