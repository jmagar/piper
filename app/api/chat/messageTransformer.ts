import { CoreMessage, Message as MessageAISDK, TextPart, ToolCallPart } from 'ai';
import { appLogger } from '@/lib/logger'; // Assuming appLogger is accessible
import { getCurrentCorrelationId } from '@/lib/logger/correlation'; // Assuming this is accessible

// Interfaces for structured 'parts' field in Prisma Message model
// These should ideally be shared if used elsewhere, or defined here if scoped to transformation
interface PrismaMessagePartsAssistant {
  tool_calls?: Array<{ id?: string; toolCallId?: string; name?: string; toolName?: string; args: Record<string, unknown>; type?: string }>;
}
interface PrismaMessagePartsTool {
  tool_call_id?: string;
  tool_name?: string;
  result?: string | Record<string, unknown> | unknown[]; // Result can be complex
  error?: { message?: string; stack?: string; [key: string]: any };
}

export function transformMessagesToCoreMessages(messages: MessageAISDK[], correlationId?: string): CoreMessage[] {
  return messages.map((m: MessageAISDK): CoreMessage => {
    const role = m.role as CoreMessage['role'];
    let originalContentString = '';

    // Normalize content to string for initial processing or if it's simple
    if (typeof m.content === 'string') {
      originalContentString = m.content;
    } else if (Array.isArray(m.content)) {
      // For array content (like tool results or complex assistant messages from DB),
      // try to serialize or extract primary text for logging/debugging.
      // The specific role handlers below will properly structure the CoreMessage content.
      originalContentString = m.content.map(part => 
        typeof part === 'string' ? part : (part.type === 'text' ? part.text : JSON.stringify(part))
      ).join('');
    }

    if (role === 'assistant') {
      const assistantContentParts: (TextPart | ToolCallPart)[] = [];
      // If the original content was a simple string, add it as a text part.
      if (typeof m.content === 'string' && m.content.trim() !== '') {
        assistantContentParts.push({ type: 'text', text: m.content });
      }
      // If content is already an array of parts (e.g. from previous SDK interaction stored in DB)
      else if (Array.isArray(m.content)) {
         m.content.forEach(part => {
            if(part.type === 'text' || part.type === 'tool-call') {
                assistantContentParts.push(part as TextPart | ToolCallPart);
            }
         });
      }

      // Check for tool_calls in m.parts (from Prisma Message)
      const assistantPartsData = m.parts as PrismaMessagePartsAssistant | null;
      if (assistantPartsData?.tool_calls && Array.isArray(assistantPartsData.tool_calls)) {
        assistantPartsData.tool_calls.forEach(tc => {
          assistantContentParts.push({
            type: 'tool-call',
            toolCallId: tc.id || tc.toolCallId || `tc-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            toolName: tc.name || tc.toolName || 'unknown_tool_from_db_parts',
            args: tc.args || {},
          });
        });
      }
      return {
        role: 'assistant',
        content: assistantContentParts,
      };
    } else if (role === 'tool') {
      let toolCallIdFromParts = `tc-result-${Date.now()}`;
      let toolNameFromParts = 'unknown_tool_from_db';
      let toolResultContent: any = originalContentString; // Default to string content

      if (m.parts) {
        const partsData = m.parts as PrismaMessagePartsTool | null;
        if (partsData?.tool_call_id) toolCallIdFromParts = partsData.tool_call_id;
        if (partsData?.tool_name) toolNameFromParts = partsData.tool_name;
        // If 'result' field exists in parts, prioritize it. It could be string or structured.
        if (partsData && typeof partsData.result !== 'undefined') {
          toolResultContent = partsData.result;
        } else if (typeof m.content === 'string') {
            toolResultContent = m.content; // Use direct string content if no parts.result
        }
      }
      return {
        role: 'tool',
        content: [{
          type: 'tool-result',
          toolCallId: toolCallIdFromParts,
          toolName: toolNameFromParts,
          result: toolResultContent,
        }],
      };
    } else if (role === 'user') {
      return { role: 'user', content: originalContentString };
    } else if (role === 'system') {
      return { role: 'system', content: originalContentString };
    }

    // Fallback for unexpected roles
    appLogger.warn(
      `[transformMessages] Unexpected message role '${m.role}'. Original content: ${originalContentString.substring(0, 100)}`,
      { correlationId, messageDetails: { role: m.role, contentPreview: originalContentString.substring(0, 100) } }
    );
    return { role: 'user', content: `Error: Unexpected message role '${m.role}'. Original content: ${originalContentString}` };
  });
}
