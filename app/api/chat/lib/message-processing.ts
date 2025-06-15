import { Message as MessageAISDK, CoreMessage, ToolSet } from "ai";
import { getCombinedMCPToolsForAISDK, getManagedServersInfo } from "@/lib/mcp/mcpManager";
import { reportMCPError } from "@/lib/mcp/enhanced-integration";
import { prisma } from "@/lib/prisma";
import { appLogger } from '@/lib/logger';
import { getCurrentCorrelationId } from '@/lib/logger/correlation';
import fs from 'fs/promises';
import path from 'path';
import { 
  parseToolMentions, 
  stripToolMentions, 
  parsePromptMentions, 
  stripPromptMentions, 
  parseUrlMentions, 
  stripUrlMentions, 
  parseFileMentions,
  stripFileMentions,
  FileMention // Assuming FileMention type is exported from tool-mention
} from "@/app/types/tool-mention";
import { truncateToolOutput } from "./token-management";

// =============================================================================
// CONFIGURATION
// =============================================================================

const PROCESSING_CONFIG = {
  MAX_URL_CONTENT_LENGTH: 2000,
} as const;

// =============================================================================
// TOOL MENTION PROCESSING
// =============================================================================

/**
 * Process tool mentions in the last user message and execute them
 */
export async function processToolMentions(messages: MessageAISDK[]): Promise<MessageAISDK[]> {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user' || typeof lastMessage.content !== 'string') {
    return messages;
  }

  const toolMentions = parseToolMentions(lastMessage.content);
  if (toolMentions.length === 0) {
    return messages;
  }

  appLogger.debug(`[processToolMentions] Found ${toolMentions.length} tool mentions to process`, { correlationId: getCurrentCorrelationId(), count: toolMentions.length });

  // Get available MCP tools to find full tool IDs
  const serversInfo = await getManagedServersInfo();
  const availableTools = serversInfo
    .filter(server => server.status === 'success')
    .flatMap(server => 
      server.tools.map(tool => ({
        name: tool.name,
        serverId: server.key,
        serverLabel: server.label,
        fullId: `${server.key}_${tool.name}`
      }))
    );

  // Get combined tools for execution
  const combinedTools = await getCombinedMCPToolsForAISDK();

  const processedMessages = [...messages];
  const toolExecutionPromises = toolMentions.map(async (mention) => {
    appLogger.debug(`[processToolMentions] Preparing tool for execution: ${mention.toolName || 'unknown'}`, { correlationId: getCurrentCorrelationId(), toolName: mention.toolName });
    const matchingTool = availableTools.find(tool => tool.name === mention.toolName);

    if (!matchingTool) {
      appLogger.warn(`[processToolMentions] Tool not found: ${mention.toolName || 'unknown'}`, {
        correlationId: getCurrentCorrelationId(),
        toolName: mention.toolName,
        availableTools: availableTools.map(t => t.name)
      });
      return {
        type: 'error' as const,
        mention,
        message: `Tool ${mention.toolName || 'unknown'} not found.`
      };
    }

    const toolFunction = combinedTools[matchingTool.fullId];
    if (!toolFunction || typeof toolFunction.execute !== 'function') {
      appLogger.warn(`[processToolMentions] Tool function not available or not executable: ${matchingTool.fullId}`, {
        correlationId: getCurrentCorrelationId(),
        toolId: matchingTool.fullId,
        availableCombinedTools: Object.keys(combinedTools)
      });
      return {
        type: 'error' as const,
        mention,
        message: `Tool function ${mention.toolName || 'unknown'} is not available.`
      };
    }

    try {
      appLogger.info(`[processToolMentions] Executing tool: ${matchingTool.fullId}`, {
        correlationId: getCurrentCorrelationId(),
        toolId: matchingTool.fullId,
        parameters: mention.parameters
      });

      const result = await toolFunction.execute(mention.parameters, {
        toolCallId: `tool-call-${Date.now()}-${Math.random()}`,
        messages: [] // Assuming messages are not needed for individual tool execution context here
      });

      const correlationId = getCurrentCorrelationId() || 'unknown';
      const fullContent = JSON.stringify(result, null, 2);
      appLogger.debug(`[processToolMentions] Full tool output for '${mention.toolName || 'unknown'}'`, {
        correlationId,
        toolName: mention.toolName || 'unknown',
        outputLength: fullContent.length,
      });

      const processedContent = truncateToolOutput(fullContent, mention.toolName || 'unknown', correlationId);
      appLogger.info(`[processToolMentions] Tool ${matchingTool.fullId} executed successfully`, { correlationId: getCurrentCorrelationId(), toolId: matchingTool.fullId });
      
      return {
        type: 'success' as const,
        mention,
        content: processedContent
      };
    } catch (error) {
      appLogger.error(`[processToolMentions] Error executing tool ${matchingTool.fullId}`, {
        correlationId: getCurrentCorrelationId(),
        toolId: matchingTool.fullId,
        error
      });

      if (error instanceof Error) {
        await reportMCPError(matchingTool.serverId, mention.toolName || 'unknown', error, {
          fullId: matchingTool.fullId,
          parameters: mention.parameters,
          correlationId: getCurrentCorrelationId()
        });
      }
      return {
        type: 'error' as const,
        mention,
        message: `Tool ${mention.toolName || 'unknown'} failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  });

  const executionResults = await Promise.allSettled(toolExecutionPromises);
  const toolResults: MessageAISDK[] = [];

  executionResults.forEach(settledResult => {
    if (settledResult.status === 'fulfilled') {
      const resultValue = settledResult.value;
      if (resultValue.type === 'success') {
        toolResults.push({
          id: `tool-result-${Date.now()}-${Math.random()}`,
          role: 'assistant',
          content: resultValue.content
        });
      } else { // Error reported by our logic (e.g., tool not found, or execution error)
        toolResults.push({
          id: `tool-error-${Date.now()}-${Math.random()}`,
          role: 'assistant',
          content: resultValue.message
        });
      }
    } else {
      // This case handles unexpected errors in the promise logic itself, not tool execution errors
      appLogger.error('[processToolMentions] Unexpected error in tool processing promise', {
        correlationId: getCurrentCorrelationId(),
        error: settledResult.reason
      });
      toolResults.push({
        id: `tool-error-unexpected-${Date.now()}-${Math.random()}`,
        role: 'assistant',
        content: 'An unexpected system error occurred while processing a tool.'
      });
    }
  });

  // Update the last message to remove tool mentions
  const cleanedContent = stripToolMentions(lastMessage.content);
  if (cleanedContent) {
    processedMessages[processedMessages.length - 1] = {
      ...lastMessage,
      content: cleanedContent
    };
  } else {
    // If only tool mentions, replace with a generic message
    processedMessages[processedMessages.length - 1] = {
      ...lastMessage,
      content: 'I executed the requested tools.'
    };
  }

  // Add tool results before the final user message
  return [...processedMessages.slice(0, -1), ...toolResults, processedMessages[processedMessages.length - 1]];
}

// =============================================================================
// URL MENTION PROCESSING
// =============================================================================

/**
 * Process URL mentions in the last user message and fetch their content
 */
export async function processUrlMentions(messages: MessageAISDK[]): Promise<MessageAISDK[]> {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user' || typeof lastMessage.content !== 'string') {
    return messages;
  }

  const urlMentions = parseUrlMentions(lastMessage.content);
  if (urlMentions.length === 0) {
    return messages;
  }

  appLogger.debug(`[processUrlMentions] Found ${urlMentions.length} URL mentions to process`, { correlationId: getCurrentCorrelationId(), count: urlMentions.length });

  const allTools = await getCombinedMCPToolsForAISDK();
  const fetchTool: ToolSet[string] | undefined = allTools['fetch_fetch']; // Assuming serverKey 'fetch' and toolName 'fetch'

  if (!fetchTool || typeof fetchTool.execute !== 'function') {
    appLogger.warn('[processUrlMentions] Fetch tool (fetch_fetch) not available or not executable.', { correlationId: getCurrentCorrelationId() });
    const updatedMessages = [...messages];
    if (updatedMessages.length > 0) {
      const currentLastMessage = updatedMessages[updatedMessages.length - 1];
      const cleanedContent = stripUrlMentions(currentLastMessage.content);
      updatedMessages[updatedMessages.length - 1] = { ...currentLastMessage, content: cleanedContent };
      updatedMessages.push({
        id: `url-fetch-tool-unavailable-${Date.now()}`,
        role: 'assistant',
        content: 'The URL fetching tool is currently unavailable. Cannot process URL mentions.'
      });
      appLogger.info(`[processFileMentions] Finished processing. Output Messages. Attachments (first 50 chars + length):`, {
    correlationId,
    updatedMessages: updatedMessages.map(m => ({
      id: m.id,
      role: m.role,
      content: typeof m.content === 'string' ? m.content.substring(0,100) + (m.content.length > 100 ? '...' : '') : '[Non-string content]',
      experimental_attachments: m.experimental_attachments?.map(att => ({ contentType: att.contentType, name: att.name, content: typeof att.content === 'string' ? `${att.content.substring(0, 50)}[...len:${att.content.length}]` : `[type:${typeof att.content}]` }))
    }))
  });
  return updatedMessages;
    }
    return messages; // Should not happen if urlMentions.length > 0, but good for safety
  }

  const urlProcessingPromises = urlMentions.map(async (mention) => {
    try {
      appLogger.info(`[processUrlMentions] Fetching URL: ${mention.url}`, { correlationId: getCurrentCorrelationId(), url: mention.url });
      
      // Ensure fetchTool.execute is callable before invoking (already checked, but for TS in map)
      const result = await fetchTool.execute!({ url: mention.url, max_length: PROCESSING_CONFIG.MAX_URL_CONTENT_LENGTH }, {
        toolCallId: `tool-call-fetch-${Date.now()}-${Math.random()}`,
        messages: messages as CoreMessage[] // Pass existing messages for context if tool needs it
      });

      const correlationId = getCurrentCorrelationId() || 'unknown';
      let contentToInject = "Could not extract content.";

      if (typeof result === 'string') {
        contentToInject = result;
      } else if (result && typeof result === 'object') {
        contentToInject = processUrlFetchResult(result, mention.url);
      }

      // Truncate here, after specific processing by processUrlFetchResult
      const processedContent = truncateToolOutput(contentToInject, `content from ${mention.url}`, correlationId);
      
      appLogger.info(`[processUrlMentions] Successfully fetched and processed URL: ${mention.url}`, { correlationId: getCurrentCorrelationId(), url: mention.url });
      
      return {
        type: 'success' as const,
        mention,
        content: `Content from ${mention.url}:\n${processedContent}`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      appLogger.error(`[processUrlMentions] Error fetching URL ${mention.url}`, { 
        correlationId: getCurrentCorrelationId(), 
        url: mention.url, 
        error 
      });
      return {
        type: 'error' as const,
        mention,
        message: `Failed to fetch content from ${mention.url}: ${errorMessage}`
      };
    }
  });

  const settledResults = await Promise.allSettled(urlProcessingPromises);
  const urlResultMessages: MessageAISDK[] = [];

  settledResults.forEach(settledResult => {
    if (settledResult.status === 'fulfilled') {
      const resultValue = settledResult.value;
      urlResultMessages.push({
        id: `url-${resultValue.type === 'success' ? 'content' : 'error'}-${Date.now()}-${Math.random()}`,
        role: 'assistant',
        content: resultValue.type === 'success' ? resultValue.content : resultValue.message
      });
    } else {
      appLogger.error('[processUrlMentions] Unexpected error in URL processing promise', {
        correlationId: getCurrentCorrelationId(),
        error: settledResult.reason
      });
      // Try to get the original mention if possible, otherwise a generic error
      let mentionUrl = 'a mentioned URL';
      if (settledResult.reason && 
          typeof settledResult.reason === 'object' && 
          'mention' in settledResult.reason && 
          settledResult.reason.mention && 
          typeof (settledResult.reason.mention as { url?: unknown }).url === 'string') {
        mentionUrl = (settledResult.reason.mention as { url: string }).url;
      }
      urlResultMessages.push({
        id: `url-error-unexpected-${Date.now()}-${Math.random()}`,
        role: 'assistant',
        content: `An unexpected system error occurred while fetching ${mentionUrl}.`
      });
    }
  });
  
  const processedMessages = [...messages];
  const finalLastMessage = processedMessages[processedMessages.length - 1];
  const strippedContent = stripUrlMentions(finalLastMessage.content);
  const updatedLastUserMessage: MessageAISDK = {
    ...finalLastMessage,
    content: strippedContent || "(URL mentions processed)", // Fallback if only URL was present
  };

  // Insert fetched contents before the (now stripped) user message
  return [...processedMessages.slice(0, -1), ...urlResultMessages, updatedLastUserMessage];
}

/**
 * Process the result from URL fetch tool
 */
function processUrlFetchResult(fetchResult: object, url: string): string {
  // Check for ChunkedResponse structure
  if ('type' in fetchResult && fetchResult.type === 'chunked_response' &&
      'summary' in fetchResult && typeof fetchResult.summary === 'string' &&
       'sections' in fetchResult && Array.isArray(fetchResult.sections)) {
    
    const sectionsArray = fetchResult.sections as Array<{ title: string; content: string; [key: string]: unknown } | Record<string, unknown>>;
    const validSections = sectionsArray.filter(
      (s): s is { title: string; content: string } =>
        typeof s === 'object' && s !== null &&
        'title' in s && typeof (s as { title: unknown }).title === 'string' &&
        'content' in s && typeof (s as { content: unknown }).content === 'string'
    );
    const summaryText = (fetchResult as { summary: string }).summary;

    if (validSections.length > 0) {
      return `${summaryText}\n\n${validSections.map((s) => `${s.title}: ${s.content}`).join('\n\n')}`;
    } else if (sectionsArray.length > 0) {
      appLogger.warn(`[MessageProcessing] processUrlFetchResult: Chunked response for ${url} had sections, but they were not in the expected {title: string, content: string} format. Using summary.`, { 
        correlationId: getCurrentCorrelationId(), 
        url,
        sections: fetchResult.sections // Log the actual sections for diagnostics
      });
      return `${summaryText}\n\n(Content sections found but were not in the expected format. Summary provided.)`;
    } else {
      return summaryText; // Just use summary if no valid sections
    }
  } 
  // Check for TruncatedResponse structure
  else if ('type' in fetchResult && fetchResult.type === 'truncated_response' &&
           'content' in fetchResult && typeof fetchResult.content === 'string') {
    return (fetchResult as { content: string }).content;
  } 
  // Fallback for other object structures
  else {
    appLogger.warn(`[MessageProcessing] processUrlFetchResult: Received unexpected object structure from fetch tool for URL ${url}. Stringifying result.`, { 
      correlationId: getCurrentCorrelationId(), 
      url, 
      fetchResult // Log the entire result for diagnostics
    });
    // Attempt to find a common 'error' or 'message' property
    if ('error' in fetchResult && typeof (fetchResult as {error: unknown}).error === 'string') {
      return `Error fetching URL: ${(fetchResult as {error: string}).error}`;
    }
    if ('message' in fetchResult && typeof (fetchResult as {message: unknown}).message === 'string') {
      return `Error fetching URL: ${(fetchResult as {message: string}).message}`;
    }
    return JSON.stringify(fetchResult, null, 2); // Pretty print JSON for better readability if it's stringified
  }
}


// =============================================================================
// FILE MENTION PROCESSING
// =============================================================================

const getContentTypeFromPath = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'txt') return 'text/plain';
  if (ext === 'pdf') return 'application/pdf';
  // Add more common types as needed
  return 'application/octet-stream'; // Default binary stream
};

/**
 * Process file mentions in the last user message and add them as attachments.
 */
const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads'; // Ensure this aligns with your project's UPLOADS_DIR source

export async function processFileMentions(messages: MessageAISDK[]): Promise<MessageAISDK[]> {
  const correlationId = getCurrentCorrelationId();
  appLogger.info(`[processFileMentions] Starting processing. Input Messages. Attachments (first 50 chars + length):`, {
    correlationId,
    messages: messages.map(m => ({
      id: m.id,
      role: m.role,
      content: typeof m.content === 'string' ? m.content.substring(0,100) + (m.content.length > 100 ? '...' : '') : '[Non-string content]',
      experimental_attachments: m.experimental_attachments?.map(att => ({ contentType: att.contentType, name: att.name, content: typeof att.content === 'string' ? `${att.content.substring(0, 50)}[...len:${att.content.length}]` : `[type:${typeof att.content}]` }))
    }))
  });
  const lastMessageIndex = messages.length - 1;
  if (lastMessageIndex < 0) return messages;

  const updatedMessages = [...messages];
  const updatedLastMessage = { ...updatedMessages[lastMessageIndex] };

  if (typeof updatedLastMessage.content !== 'string') {
    return messages;
  }

  const fileMentions = parseFileMentions(updatedLastMessage.content);
  appLogger.debug(`[processFileMentions] Parsed fileMentions from last user message`, { correlationId, fileMentions });
  if (fileMentions.length === 0) {
    return messages;
  }

  appLogger.info(`[processFileMentions] Found ${fileMentions.length} file mentions to process`, { 
    correlationId: getCurrentCorrelationId(), 
    count: fileMentions.length 
  });

  // Ensure experimental_attachments array exists
  if (!updatedLastMessage.experimental_attachments) {
    updatedLastMessage.experimental_attachments = [];
  }

  // Define appUrl once, outside the map, if NEXT_PUBLIC_APP_URL is guaranteed to be set.
  // If it can be undefined, error handling or a default should be considered here.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    appLogger.error('[processFileMentions] NEXT_PUBLIC_APP_URL is not set. Cannot form absolute URLs for non-image files or fallbacks.', { correlationId: getCurrentCorrelationId() });
    // Potentially return or throw, or proceed knowing some URLs might be broken.
    // For now, we'll let it proceed and URLs for non-images might be relative or incorrect.
  }

  const attachmentsPromises = fileMentions.map(async (mention: FileMention) => {
    const fileName = mention.path.split('/').pop() || mention.path;
    const contentType = getContentTypeFromPath(mention.path);

    const attachment: { url: string; name: string; contentType: string } = {
      url: '', // Placeholder, will be replaced
      name: fileName,
      contentType: contentType,
    };

    // Determine URL (data URL for images, API URL for others)
    if (attachment.contentType.startsWith('image/')) {
      const resolvedUploadsDir = path.resolve(UPLOADS_DIR);
      // Important: resolve the path to be absolute for security checks and file reading
      const resolvedFullLocalPath = path.resolve(UPLOADS_DIR, mention.path);

      appLogger.info('[FileMentionDebug] Processing image mention', {
        cwd: process.cwd(),
        UPLOADS_DIR,
        mentionPath: mention.path,
        resolvedUploadsDir,
        resolvedFullLocalPath,
      });

      // Security check: ensure the resolved path is within the uploads directory
      if (!resolvedFullLocalPath.startsWith(resolvedUploadsDir)) {
        appLogger.warn(`[FileMentionDebug] Security check failed. Path traversal attempt?`, { resolvedFullLocalPath, resolvedUploadsDir });
        attachment.url = appUrl ? new URL(`/api/files/view/${mention.path}`, appUrl).toString() : `/api/files/view/${mention.path}`;
        attachment.name = `Error accessing ${fileName}`;
      } else {
        try {
          const fileBuffer = await fs.readFile(resolvedFullLocalPath); // <-- FIX: Use resolved path
          const base64String = fileBuffer.toString('base64');
          attachment.url = `data:${attachment.contentType};base64,${base64String}`;
          appLogger.debug(`[processFileMentions] Generated data URL for image: ${fileName}`, { correlationId: getCurrentCorrelationId() });
        } catch (error: unknown) {
          let errorCode: string | undefined;
          let errorMessage: string | undefined;

          if (error instanceof Error) {
            // NodeJS.ErrnoException is common for fs errors and has a 'code' property
            // Also, check if 'code' exists on the error object for robustness
            errorCode = (error as NodeJS.ErrnoException).code || (error as { code?: string }).code;
            errorMessage = error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          } else if (typeof error === 'object' && error !== null) {
            // Fallback for other error object shapes
            errorCode = (error as { code?: string }).code;
            errorMessage = (error as { message?: string }).message;
          } else {
            // If the error is of an unexpected type, log it as a string
            errorMessage = String(error);
          }

          appLogger.error('[FileMentionDebug] Error reading file for base64 conversion.', {
            filePath: resolvedFullLocalPath,
            errorCode: errorCode,
            errorMessage: errorMessage,
          });
          // Fallback to URL if file reading fails
          attachment.url = appUrl ? new URL(`/api/files/view/${mention.path}`, appUrl).toString() : `/api/files/view/${mention.path}`;
          attachment.name = `Error processing ${fileName}`;
        }
      }
    } else {
      // For non-image files, use the API view URL
      attachment.url = appUrl ? new URL(`/api/files/view/${mention.path}`, appUrl).toString() : `/api/files/view/${mention.path}`;
    }

    appLogger.debug(`[processFileMentions] Created attachment object for mention`, {
      correlationId,
      mentionPath: mention.path,
      attachmentObject: {
        contentType: attachment.contentType,
        name: attachment.name,
        url: typeof attachment.url === 'string' ? `${attachment.url.substring(0, 70)}[...len:${attachment.url.length}]` : `[type:${typeof attachment.url}]`,
        // Do not log full base64 'content' here, URL is enough for this log level
      }
    });
    return attachment;
  });

  updatedLastMessage.experimental_attachments = await Promise.all(attachmentsPromises);

  // Update the message content to remove file mentions
  const cleanedContent = stripFileMentions(updatedLastMessage.content);
  updatedLastMessage.content = cleanedContent || '(File mentions processed)';  // Replace the last message with the updated one
  updatedMessages[lastMessageIndex] = updatedLastMessage;
  return updatedMessages;
}

// =============================================================================
// PROMPT MENTION PROCESSING
// =============================================================================

/**
 * Process prompt mentions and inject rule content into system prompt
 */
export async function processPromptMentions(
  messages: MessageAISDK[]
): Promise<{ processedMessages: MessageAISDK[]; enhancedSystemPrompt: string; }> {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user' || typeof lastMessage.content !== 'string') {
    return { processedMessages: messages, enhancedSystemPrompt: '' };
  }

  const promptMentions = parsePromptMentions(lastMessage.content);
  if (promptMentions.length === 0) {
    return { processedMessages: messages, enhancedSystemPrompt: '' };
  }

  appLogger.debug(`[processPromptMentions] Found ${promptMentions.length} prompt mentions`, { correlationId: getCurrentCorrelationId(), count: promptMentions.length });

  let allPrompts: { id: string; name: string; system_prompt: string | null; }[] = [];
  try {
    // Fetch all mentioned prompts in a single query to avoid N+1 problem
    allPrompts = await prisma.prompt.findMany({
      where: {
        OR: [
          { id: { in: promptMentions.map(p => p.promptId) } },
          { name: { in: promptMentions.map(p => p.promptName) } },
        ],
      },
      select: {
        id: true,
        name: true,
        system_prompt: true
      }
    });
  } catch (error) {
    appLogger.error('[processPromptMentions] Failed to fetch prompts from database', {
      correlationId: getCurrentCorrelationId(),
      error,
    });
    // Return early with an error message in the chat content
    const updatedMessages = [...messages];
    const lastMsg = updatedMessages.at(-1);
    if (lastMsg) {
      const cleanedContent = stripPromptMentions(lastMsg.content);
      updatedMessages[updatedMessages.length - 1] = { ...lastMsg, content: cleanedContent };
    }
    updatedMessages.push({
      id: `prompt-fetch-db-error-${Date.now()}`,
      role: 'assistant',
      content: 'A database error occurred while trying to retrieve mentioned prompts.'
    });
    // Return the correct shape
    return { processedMessages: updatedMessages, enhancedSystemPrompt: '' };
  }

  const promptContents: string[] = [];
  for (const mention of promptMentions) {
    const prompt = allPrompts.find(p => p.id === mention.promptId || p.name === mention.promptName);

    if (prompt) {
      appLogger.debug(`[processPromptMentions] Found prompt: ${prompt.name}`, { correlationId: getCurrentCorrelationId(), promptName: prompt.name, slug: mention.promptSlug });
      if (prompt.system_prompt) {
        promptContents.push(prompt.system_prompt);
      }
    } else {
      appLogger.warn(`[processPromptMentions] Prompt not found for mention: ${mention.promptSlug}`, {
        correlationId: getCurrentCorrelationId(),
        slug: mention.promptSlug
      });
    }
  }

  const enhancedSystemPrompt = promptContents.join('\n\n---\n\n');
  const cleanedContent = stripPromptMentions(lastMessage.content);

  const processedMessages = [...messages];
  if (cleanedContent) {
    processedMessages[processedMessages.length - 1] = {
      ...lastMessage,
      content: cleanedContent,
    };
  } else {
    // If only prompt mentions, replace with a generic message
    // If only rule mentions, replace with a generic message
    processedMessages[processedMessages.length - 1] = {
      ...lastMessage,
      content: 'I would like you to apply the mentioned rules to our conversation.'
    };
  }

  appLogger.info(`[processPromptMentions] Enhanced system prompt with ${promptContents.length} prompt(s)`, { correlationId: getCurrentCorrelationId(), count: promptContents.length });
  return { processedMessages, enhancedSystemPrompt };
}