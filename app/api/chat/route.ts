import 'dotenv/config'; // Ensure .env variables are loaded using ES module syntax

import { loadAgent } from "@/lib/agents/load-agent"
import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { loadMCPToolsFromURL } from "@/lib/mcp/load-mcp-from-url";
import { getCombinedMCPToolsForAISDK, getManagedServersInfo } from "@/lib/mcp/mcpManager";
import { reportMCPError } from "@/lib/mcp/enhanced-integration";
// import { MODELS } from "@/lib/models" // Removed unused import
import { Attachment } from "@ai-sdk/ui-utils"
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  CoreMessage,
  Message as MessageAISDK,
  ToolCallPart,
  // ToolResultPart removed as it's unused and structural typing via LanguageModelV1StreamPart is preferred
  ToolSet,
  streamText,
  LanguageModelV1StreamPart, 
  TextPart,
  FinishReason,
  LanguageModelUsage
  // StreamData removed as unused
  // ToolDefinition removed as it's not exported / used directly here
} from "ai";
import { prisma } from "@/lib/prisma"; 
import {
  logUserMessage,
  validateAndTrackUsage,
  trackSpecialAgentUsage,
} from "./api"
import { saveFinalAssistantMessage } from "./db"
import { parseToolMentions, stripToolMentions, parsePromptMentions, stripPromptMentions, parseUrlMentions, stripUrlMentions } from "@/app/types/tool-mention";

// Import our logging system
import { aiSdkLogger, AiProvider, AiSdkOperation, StreamingState } from '@/lib/logger/ai-sdk-logger'
import { appLogger } from '@/lib/logger'
import { getCurrentCorrelationId } from '@/lib/logger/correlation';

import { get_encoding, Tiktoken } from 'tiktoken'; // Corrected: Use only get_encoding as getEncoding is not exported
import { JSONSchema7 } from 'json-schema'; // Added for tool parameter typing

export const maxDuration = 60;

// Initialize tiktoken encoder
// Using "cl100k_base" as it's common for GPT-3.5/4 and a good general default
let enc: Tiktoken;
try {
  enc = get_encoding("cl100k_base");
} catch (e) {
  // Fallback or handle error if model encoding is not found
  // For robustness, you might load a specific encoding file if needed
  appLogger.error("[ChatAPI] Failed to load tiktoken encoder cl100k_base, attempting fallback.", e);
  // As a last resort, if encoding_for_model fails, you might need to handle this case,
  // perhaps by disabling token-based features or using a very rough char-based estimate.
  // For now, we'll assume it loads or log the error.
  // A more robust solution might involve bundling the .tiktoken file.
  // If this fails, subsequent calls to enc.encode will throw.
}

// Configurable thresholds from environment variables
// const PRUNING_TARGET_TOKEN_LIMIT = parseInt(process.env.PRUNING_TARGET_TOKEN_LIMIT || "3000", 10); // Replaced by dynamic calculation
const MAX_TOOL_OUTPUT_TOKENS = parseInt(process.env.MAX_TOOL_OUTPUT_TOKENS || "750", 10);
const APPROX_CHARS_PER_TOKEN = 3; // A rough estimate for character-based truncation fallback if needed

type ChatRequest = {
  messages: MessageAISDK[]
  chatId: string
  model: string
  systemPrompt: string
  agentId?: string
}

// Helper function to count tokens for a message
function countTokens(message: MessageAISDK | { role: string; content: string }): number {
  if (!enc) {
    appLogger.warn("[countTokens] Tiktoken encoder not initialized. Falling back to character count / N for token estimation.");
    // Fallback: estimate tokens based on character count if encoder failed to load
    const charCount = typeof message.content === 'string' ? message.content.length : JSON.stringify(message.content).length;
    return Math.ceil(charCount / APPROX_CHARS_PER_TOKEN) + 4; // +4 for role/overhead
  }
  let tokenCount = 4; // Base tokens for message structure (role, etc.)
  if (typeof message.content === 'string') {
    tokenCount += enc.encode(message.content).length;
  } else if (Array.isArray(message.content)) { // Handle tool calls if they are in CoreMessage format
    // This part is an estimation. For Vercel AI SDK `Message` type, content is string.
    // If `CoreMessage` with tool calls/results parts were to be pruned, this would need refinement.
    tokenCount += enc.encode(JSON.stringify(message.content)).length;
  }
  return tokenCount;
}

// Helper function to process tool mentions and execute tools
async function processToolMentions(messages: MessageAISDK[]): Promise<MessageAISDK[]> {
  const lastMessage = messages[messages.length - 1]
  if (!lastMessage || lastMessage.role !== 'user' || typeof lastMessage.content !== 'string') {
    return messages
  }

  const toolMentions = parseToolMentions(lastMessage.content)
  if (toolMentions.length === 0) {
    return messages
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Chat API] Found ${toolMentions.length} tool mentions to process`)
  }

  // Get available MCP tools to find full tool IDs
  const serversInfo = await getManagedServersInfo()
  const availableTools = serversInfo
    .filter(server => server.status === 'success')
    .flatMap(server => 
      server.tools.map(tool => ({
        name: tool.name,
        serverId: server.key,
        serverLabel: server.label,
        fullId: `${server.key}_${tool.name}`
      }))
    )

  // Get combined tools for execution
  const combinedTools = await getCombinedMCPToolsForAISDK()

  const processedMessages = [...messages]
  const toolResults: MessageAISDK[] = []

  // Process each tool mention
  for (const mention of toolMentions) {
    console.log(`[Chat API] Processing tool mention: ${mention.toolName}`)
    const matchingTool = availableTools.find(tool => tool.name === mention.toolName)
    if (!matchingTool) {
      console.warn(`[Chat API] Tool not found: ${mention.toolName}`)
      console.log(`[Chat API] Available tools:`, availableTools.map(t => t.name))
      continue
    }

    console.log(`[Chat API] Found matching tool: ${matchingTool.fullId}`)
    const toolFunction = combinedTools[matchingTool.fullId]
    if (!toolFunction) {
      console.warn(`[Chat API] Tool function not available: ${matchingTool.fullId}`)
      console.log(`[Chat API] Available combined tools:`, Object.keys(combinedTools))
      continue
    }

    try {
      console.log(`[Chat API] Executing tool: ${matchingTool.fullId} with params:`, mention.parameters)
      
      if (!toolFunction.execute) {
        throw new Error('Tool execute function is not available')
      }
      
      const result = await toolFunction.execute(mention.parameters, {
        toolCallId: `tool-call-${Date.now()}-${Math.random()}`,
        messages: []
      })
      
      // Add tool result as assistant message
      toolResults.push({
        id: `tool-result-${Date.now()}-${Math.random()}`,
        role: 'assistant',
        content: (() => {
        const correlationId = getCurrentCorrelationId();
        const fullContent = JSON.stringify(result, null, 2);
        let processedContentString = `Tool ${mention.toolName} executed successfully:\n\n${fullContent}`;

        // Log the full, untruncated tool output
        appLogger.info(`[processToolMentions] Full tool output for '${mention.toolName}'`, {
          correlationId,
          toolName: mention.toolName,
          outputLength: fullContent.length,
          // Storing full output in logs can be verbose, consider if this is always needed or only for dev/debug
          // output: fullContent, // Uncomment if full output logging is desired here
        });

        const toolOutputTokens = countTokens({ role: 'assistant', content: processedContentString });

        if (toolOutputTokens > MAX_TOOL_OUTPUT_TOKENS) {
          appLogger.warn(
            `[processToolMentions] Tool output for '${mention.toolName}' exceeds token limit. Original tokens: ${toolOutputTokens}, Max: ${MAX_TOOL_OUTPUT_TOKENS}. Truncating.`, 
            { correlationId, toolName: mention.toolName, originalTokens: toolOutputTokens }
          );
          // Truncate the JSON part of the content string
          // We need to be careful to truncate `fullContent` then reconstruct `processedContentString`
          let truncatedJsonContent = fullContent;
          if (enc) {
            const encodedJson = enc.encode(fullContent);
            if (encodedJson.length > (MAX_TOOL_OUTPUT_TOKENS - countTokens({role: 'assistant', content: `Tool ${mention.toolName} executed successfully:\n\n`}) - 10)) { // -10 for truncation message
              const slicedEncodedJson = encodedJson.slice(0, MAX_TOOL_OUTPUT_TOKENS - countTokens({role: 'assistant', content: `Tool ${mention.toolName} executed successfully:\n\n`}) - 10);
              truncatedJsonContent = new TextDecoder().decode(enc.decode(slicedEncodedJson));
            } else {
              // This case should ideally not be hit if toolOutputTokens > MAX_TOOL_OUTPUT_TOKENS
              // but as a fallback, use character based if somehow token calculation is off for the parts
              const approxCharsToKeep = (MAX_TOOL_OUTPUT_TOKENS - countTokens({role: 'assistant', content: `Tool ${mention.toolName} executed successfully:\n\n`}) - 10) * APPROX_CHARS_PER_TOKEN;
              truncatedJsonContent = fullContent.substring(0, approxCharsToKeep);
            }
          } else {
            // Fallback to character-based truncation if tiktoken is not available
            const headerLength = `Tool ${mention.toolName} executed successfully:\n\n`.length;
            const truncationMessageLength = `\n\n[Output truncated due to length. Original token count: ${toolOutputTokens}. Full output logged server-side.]`.length;
            const targetChars = (MAX_TOOL_OUTPUT_TOKENS * APPROX_CHARS_PER_TOKEN) - headerLength - truncationMessageLength;
            truncatedJsonContent = fullContent.substring(0, Math.max(0, targetChars));
          }
          
          processedContentString = `Tool ${mention.toolName} executed successfully:\n\n${truncatedJsonContent}\n\n[Output truncated due to length. Original token count: ${toolOutputTokens}. Full output logged server-side.]`;
          
          appLogger.info(
            `[processToolMentions] Tool output for '${mention.toolName}' was truncated. New token count: ${countTokens({role: 'assistant', content: processedContentString})}`,
            { correlationId, toolName: mention.toolName }
          );
        }
        return processedContentString;
      })()
      })
      
      console.log(`[Chat API] Tool ${matchingTool.fullId} executed successfully`)
    } catch (error) {
      console.error(`[Chat API] Error executing tool ${matchingTool.fullId}:`, error)
      
      // Enhanced error reporting with metrics
      if (error instanceof Error) {
        await reportMCPError(matchingTool.serverId, mention.toolName, error, {
          fullId: matchingTool.fullId,
          parameters: mention.parameters,
          correlationId: getCurrentCorrelationId()
        })
      }
      
      toolResults.push({
        id: `tool-error-${Date.now()}`,
        role: 'assistant', 
        content: `Tool ${mention.toolName} failed: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  }

  // Update the last message to remove tool mentions
  const cleanedContent = stripToolMentions(lastMessage.content)
  if (cleanedContent) {
    processedMessages[processedMessages.length - 1] = {
      ...lastMessage,
      content: cleanedContent
    }
  } else {
    // If only tool mentions, replace with a generic message
    processedMessages[processedMessages.length - 1] = {
      ...lastMessage,
      content: 'I executed the requested tools.'
    }
  }

  // Add tool results before the final user message
  return [...processedMessages.slice(0, -1), ...toolResults, processedMessages[processedMessages.length - 1]]
}

// Helper function to fetch content for URL mentions
async function processUrlMentions(messages: MessageAISDK[]): Promise<MessageAISDK[]> {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user' || typeof lastMessage.content !== 'string') {
    return messages;
  }

  const urlMentions = parseUrlMentions(lastMessage.content);
  if (urlMentions.length === 0) {
    return messages;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Chat API] Found ${urlMentions.length} URL mentions to process`);
  }

  const allTools = await getCombinedMCPToolsForAISDK();
  const fetchTool: ToolSet[string] | undefined = allTools['fetch_fetch']; // Assuming serverKey 'fetch' and toolName 'fetch'

  if (!fetchTool) {
    appLogger.error(`[ChatAPI] processUrlMentions: fetch_fetch tool not available. URL processing will be skipped.`, { correlationId: getCurrentCorrelationId() });
    // Optionally, add a single message to inform the user the service is down, if desired.
    return messages; // Early return if the tool isn't found
  }

  const fetchedContents: MessageAISDK[] = [];

  for (const mention of urlMentions) {
    try {
      if (fetchTool && typeof fetchTool.execute === 'function') {
        const toolCallId = `url-fetch-${encodeURIComponent(mention.url)}-${Date.now()}`;
        const fetchResultUntyped: unknown = await fetchTool.execute(
          { url: mention.url, max_length: 2000 },
          { toolCallId, messages: messages as CoreMessage[] }
        );

        let contentToInject = "Could not extract content.";

        if (typeof fetchResultUntyped === 'string') {
          contentToInject = fetchResultUntyped;
        } else if (fetchResultUntyped && typeof fetchResultUntyped === 'object') {
          // Check for ChunkedResponse structure
          if ('type' in fetchResultUntyped && fetchResultUntyped.type === 'chunked_response' &&
              'summary' in fetchResultUntyped && typeof fetchResultUntyped.summary === 'string' &&
              'sections' in fetchResultUntyped && Array.isArray(fetchResultUntyped.sections)) {
            
            const sectionsArray = fetchResultUntyped.sections as Array<unknown>; // Cast to Array<unknown> first

            // Filter for sections that are objects and have string 'title' and 'content' properties
            const validSections = sectionsArray.filter(
              (s): s is { title: string; content: string } => // Type predicate for clarity
                typeof s === 'object' && s !== null &&
                'title' in s && typeof (s as { title: unknown }).title === 'string' &&
                'content' in s && typeof (s as { content: unknown }).content === 'string'
            );

            const summaryText = (fetchResultUntyped as { summary: string }).summary;

            if (validSections.length > 0) {
              contentToInject = `${summaryText}\n\n${validSections.map((s) => `${s.title}: ${s.content}`).join('\n\n')}`;
            } else if (sectionsArray.length > 0) { // Sections array existed but items were not valid
              contentToInject = `${summaryText}\n\n(Content sections found but were not in the expected format or were empty.)`;
              appLogger.warn(`[ChatAPI] processUrlMentions: Chunked response for ${mention.url} had sections, but they were not in the expected {title: string, content: string} format.`, { correlationId: getCurrentCorrelationId() });
            } else { // No sections array or it was empty
              contentToInject = summaryText; // Just use summary if no valid sections
            }
          } 
          // Check for TruncatedResponse structure
          else if ('type' in fetchResultUntyped && fetchResultUntyped.type === 'truncated_response' &&
                   'content' in fetchResultUntyped && typeof fetchResultUntyped.content === 'string') {
            const truncatedData = fetchResultUntyped as { content: string };
            contentToInject = truncatedData.content;
          } 
          // Fallback for other object structures that don't match known types
          else {
            contentToInject = JSON.stringify(fetchResultUntyped);
          }
        }

        if (contentToInject.length > 2000) {
          contentToInject = contentToInject.substring(0, 2000) + "... (content truncated)";
        }
        fetchedContents.push({
          id: `url-fetch-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          role: 'assistant',
          content: `Content fetched from ${mention.url}:\n${contentToInject}`,
        });
        appLogger.info(`[ChatAPI] processUrlMentions: Successfully fetched and processed ${mention.url}`, { correlationId: getCurrentCorrelationId() });
      } else if (fetchTool) {
        // This case means fetchTool exists, but fetchTool.execute is not a function.
        appLogger.error(`[ChatAPI] processUrlMentions: fetch_fetch tool found, but 'execute' method is missing or not a function. URL processing will be skipped for ${mention.url}.`, { correlationId: getCurrentCorrelationId(), toolName: 'fetch_fetch' });
        fetchedContents.push({
          id: `assistant-url-error-${Date.now()}`,
          role: 'assistant',
          content: `[System: Could not process URL ${mention.url} as the fetch tool's execute method is currently unavailable.]`,
        });
      } else {
        // This case should ideally not be reached due to the check for !fetchTool at the start of the function
        appLogger.error(`[ChatAPI] processUrlMentions: fetch_fetch tool became undefined unexpectedly for ${mention.url}`, { correlationId: getCurrentCorrelationId() });
        fetchedContents.push({
          id: `url-fetch-error-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          role: 'assistant',
          content: `Error: URL fetching service became unavailable for ${mention.url}.`,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      appLogger.error(`[Chat API] Error fetching URL ${mention.url}: ${errorMessage}`, { 
        correlationId: getCurrentCorrelationId(), 
        error 
      });
      // reportMCPError could be used here if 'fetch' was a registered MCP server in the same way other tools are managed
      // For now, just add an error message to the chat.
      fetchedContents.push({
        id: `url-fetch-error-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        role: 'assistant',
        content: `Failed to fetch content from ${mention.url}: ${errorMessage}`,
      });
    }
  }

  const strippedContent = stripUrlMentions(lastMessage.content);
  const updatedLastUserMessage: MessageAISDK = {
    ...lastMessage,
    content: strippedContent || "(URL mention processed)", // Fallback if only URL was present
  };

  // Insert fetched contents before the (now stripped) user message
  return [...messages.slice(0, -1), ...fetchedContents, updatedLastUserMessage];
}

// Helper function to process rule mentions and inject rule content
async function processPromptMentions(messages: MessageAISDK[], currentSystemPrompt: string): Promise<{ processedMessages: MessageAISDK[], enhancedSystemPrompt: string }> {
  const lastMessage = messages[messages.length - 1]
  if (!lastMessage || lastMessage.role !== 'user' || typeof lastMessage.content !== 'string') {
    return { processedMessages: messages, enhancedSystemPrompt: currentSystemPrompt }
  }

  const promptMentions = parsePromptMentions(lastMessage.content)
  if (promptMentions.length === 0) {
    return { processedMessages: messages, enhancedSystemPrompt: currentSystemPrompt }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Chat API] Found ${promptMentions.length} prompt mentions to process`)
  }

  // Fetch rules from database
  const promptContents: string[] = []
  for (const mention of promptMentions) {
    try {
      console.log(`[Chat API] Looking up prompt: ${mention.promptSlug}`)
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prompt = await (prisma as any).prompt.findUnique({
        where: { slug: mention.promptSlug },
        select: {
          id: true,
          name: true,
          description: true,
          system_prompt: true
        }
      })

      if (prompt) {
        console.log(`[Chat API] Found prompt: ${prompt.name}`)
        promptContents.push(`\n--- Prompt: ${prompt.name} ---\n${prompt.system_prompt}\n`)
      } else {
        console.warn(`[Chat API] Prompt not found: ${mention.promptSlug}`)
        promptContents.push(`\n[Note: Prompt @${mention.promptSlug} was mentioned but not found]\n`)
      }
    } catch (error) {
      console.error(`[Chat API] Error fetching prompt ${mention.promptSlug}:`, error)
      promptContents.push(`\n[Note: Error loading prompt @${mention.promptSlug}]\n`)
    }
  }

  // Enhance system prompt with rule content
  const enhancedSystemPrompt = promptContents.length > 0 
    ? currentSystemPrompt + '\n\n--- Applied Prompts ---' + promptContents.join('')
    : currentSystemPrompt

  // Clean rule mentions from the last user message
  const processedMessages = [...messages]
  const cleanedContent = stripPromptMentions(lastMessage.content)
  
  if (cleanedContent.trim()) {
    processedMessages[processedMessages.length - 1] = {
      ...lastMessage,
      content: cleanedContent
    }
  } else {
    // If only rule mentions, replace with a generic message
    processedMessages[processedMessages.length - 1] = {
      ...lastMessage,
      content: 'I would like you to apply the mentioned rules to our conversation.'
    }
  }

  console.log(`[Chat API] Enhanced system prompt with ${promptContents.length} prompt(s)`)
  return { processedMessages, enhancedSystemPrompt }
}

// Helper function to prune messages based on token limits
function pruneMessagesForPayloadSize(
  initialMessages: MessageAISDK[], 
  dynamicPruningLimit: number, 
  correlationId?: string // Allow correlationId to be optional
): MessageAISDK[] {
  // Ensure enc is available or fallback logic is robust
  if (!enc && typeof get_encoding === 'function') {
    try {
      enc = get_encoding("cl100k_base");
    } catch (e) {
      appLogger.error("[pruneMessages] Critical: Tiktoken encoder (enc) not initialized and fallback get_encoding failed.", e, { correlationId });
      // If encoding is absolutely critical and fails, might need to throw or return error response earlier.
      // For now, countTokens will use its char-based fallback.
    }
  }

  const definiteCorrelationId = correlationId || getCurrentCorrelationId(); // Ensure we have a correlationId
  const initialTokenCount = initialMessages.reduce((sum, msg) => sum + countTokens(msg), 0);
  const initialMessageCount = initialMessages.length;

  appLogger.info(
    `[pruneMessages] Before pruning: ${initialMessageCount} messages, ~${initialTokenCount} tokens. Target limit: ${dynamicPruningLimit} tokens.`, 
    { correlationId: definiteCorrelationId, initialMessageCount, initialTokenCount, limit: dynamicPruningLimit }
  );


  if (initialTokenCount <= dynamicPruningLimit && initialMessageCount <= 50) { // Added a general message count cap as well
    appLogger.info(`[pruneMessages] No pruning needed. Token count (${initialTokenCount}) is within limit (${dynamicPruningLimit}).`, { correlationId: definiteCorrelationId });
    return initialMessages;
  }

  const systemMessages = initialMessages.filter(msg => msg.role === 'system');
  const nonSystemMessages = initialMessages.filter(msg => msg.role !== 'system');

  let currentTokenCount = systemMessages.reduce((sum, msg) => sum + countTokens(msg), 0);
  const prunedNonSystemMessages: MessageAISDK[] = [];

  // Iterate from most recent non-system messages backwards
  for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
    const message = nonSystemMessages[i];
    const messageTokens = countTokens(message);

    if (currentTokenCount + messageTokens <= dynamicPruningLimit) { 

      prunedNonSystemMessages.unshift(message); // Add to the beginning to maintain order
      currentTokenCount += messageTokens;
    } else {
      appLogger.info(
        `[pruneMessages] Token limit reached while adding older messages. Pruning ${i + 1} older non-system messages. Current tokens: ${currentTokenCount}`, 
        { correlationId: definiteCorrelationId, prunedCount: i + 1, currentTokenCount }
      );

      break; 
    }
  }
  
  // Combine system messages (always included) with the pruned non-system messages
  const finalMessages = [...systemMessages, ...prunedNonSystemMessages];
  const finalTokenCount = currentTokenCount; // This is the sum of system and pruned non-system messages

  appLogger.info(
    `[pruneMessages] After pruning: ${finalMessages.length} messages, ~${finalTokenCount} tokens. Removed: ${initialMessageCount - finalMessages.length} messages.`, 
    { correlationId: definiteCorrelationId, finalMessageCount: finalMessages.length, finalTokenCount, removedCount: initialMessageCount - finalMessages.length }
  );

  return finalMessages;
}

// The `selectRelevantTools` function still uses messageCount, which is fine for its purpose.


// Helper function to select relevant tools for large conversations
function selectRelevantTools(allTools: ToolSet, messageCount: number): ToolSet {
  const toolEntries = Object.entries(allTools)
  
  // Conservative tool limits to prevent payload issues
  const MAX_TOOLS_LONG_CONVERSATION = 25
  const MAX_TOOLS_MEDIUM_CONVERSATION = 50
  
  if (messageCount <= 10) {
    return allTools // Short conversation: use all tools
  } else if (messageCount <= 15) {
    // Medium conversation: limit tools
    if (toolEntries.length <= MAX_TOOLS_MEDIUM_CONVERSATION) {
      return allTools
    }
    
    // Prioritize general tools over server-specific ones
    const prioritizedTools = toolEntries
      .sort(([keyA], [keyB]) => {
        // Prioritize tools without server prefixes (general tools)
        const isGeneralA = !keyA.includes('_')
        const isGeneralB = !keyB.includes('_')
        if (isGeneralA && !isGeneralB) return -1
        if (!isGeneralA && isGeneralB) return 1
        return 0
      })
      .slice(0, MAX_TOOLS_MEDIUM_CONVERSATION)
    
    return Object.fromEntries(prioritizedTools) as ToolSet
  } else {
    // Long conversation: minimal essential tools
    if (toolEntries.length <= MAX_TOOLS_LONG_CONVERSATION) {
      return allTools
    }
    
    // Select most essential tools (prioritize general + common MCP tools)
    const essentialTools = toolEntries
      .filter(([key]) => {
        // Prioritize core tools
        return key.includes('file') || 
               key.includes('search') || 
               key.includes('read') || 
               key.includes('edit') || 
               key.includes('codebase') ||
               !key.includes('_') // General tools without server prefix
      })
      .slice(0, MAX_TOOLS_LONG_CONVERSATION)
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Chat API] Long conversation tool reduction: ${toolEntries.length} → ${essentialTools.length}`)
    }
    
    appLogger.aiSdk.info(`Reduced tools for long conversation`, {
      correlationId: getCurrentCorrelationId(),
      messageCount,
      originalToolCount: toolEntries.length,
      selectedToolCount: essentialTools.length
    })
    
    return Object.fromEntries(essentialTools) as ToolSet
  }
}

export async function POST(req: Request) {
  const correlationId = getCurrentCorrelationId();
  appLogger.http.info('Chat API request received', { correlationId });

  try {
    const requestBody = await req.json()
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Chat API] Messages: ${requestBody.messages?.length || 0}, Chat: ${requestBody.chatId}`)
      if (requestBody.messages?.length > 0) {
        const lastMessage = requestBody.messages[requestBody.messages.length - 1]
        if (lastMessage.experimental_attachments?.length > 0) {
          console.log(`[Chat API] ${lastMessage.experimental_attachments.length} attachments`)
        }
      }
    }
    
    const {
      messages,
      chatId,
      model,
      systemPrompt,
      agentId,
    } = requestBody as ChatRequest

    if (!messages || !chatId) {
      appLogger.http.warn('Chat API request missing required fields', { 
        correlationId,
        hasMessages: !!messages,
        hasChatId: !!chatId 
      });
      return new Response(
        JSON.stringify({ error: "Error, missing information" }),
        { status: 400 }
      )
    }

    // Log chat operation start
    appLogger.aiSdk.info('Starting chat completion', {
      correlationId,
      chatId,
      model: model || 'anthropic/claude-3.5-sonnet',
      messageCount: messages.length,
      hasAgent: !!agentId
    });

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
    appLogger.aiSdk.info(`✅ Ensured chat exists or created: ${chatId} with title "${defaultTitle}"`, { correlationId });

    // Validate request (simplified for admin-only mode)
    await validateAndTrackUsage()

    // Process tool mentions before continuing
    const processedMessagesAfterTools = await processToolMentions(messages)

    // Get initial system prompt
    let agentConfig = null
    if (agentId) {
      agentConfig = await loadAgent(agentId)
      appLogger.aiSdk.debug('Loaded agent configuration', { 
        correlationId, 
        agentId, 
        hasSystemPrompt: !!agentConfig?.systemPrompt 
      });
    }

    const initialSystemPrompt = agentConfig?.systemPrompt || systemPrompt || SYSTEM_PROMPT_DEFAULT

    // Process prompt mentions and enhance system prompt
    const { processedMessages: messagesWithPrompts, enhancedSystemPrompt: systemPromptWithPrompts } = await processPromptMentions(processedMessagesAfterTools, initialSystemPrompt);

    // Process URL mentions
    const messagesWithUrlsProcessed = await processUrlMentions(messagesWithPrompts);

    // Convert relative attachment URLs to absolute URLs for AI model access
    const messagesWithAbsoluteUrls = messagesWithUrlsProcessed.map((message) => {
      // ✅ AI SDK PATTERN: Files are already handled by AI SDK, just pass through
      return message
    })

    const userMessage = messagesWithAbsoluteUrls[messagesWithAbsoluteUrls.length - 1]

    if (userMessage?.role === "user") {
      await logUserMessage({
        chatId,
        content: userMessage.content,
        attachments: userMessage.experimental_attachments as Attachment[],
      })
    }

    // Initialize OpenRouter provider
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY, // Reverted to use environment variable
    });

    const effectiveSystemPrompt = systemPromptWithPrompts

    let toolsToUse: ToolSet | undefined = undefined

    if (agentConfig?.mcpConfig) {
      const mcpConfig = agentConfig.mcpConfig as { server?: string }
      if (mcpConfig.server) {
        const { tools } = await loadMCPToolsFromURL(mcpConfig.server)
        toolsToUse = tools as ToolSet
      }
    } else if (agentConfig?.tools) {
      toolsToUse = agentConfig.tools as unknown as ToolSet
      await trackSpecialAgentUsage()
    } else {
      // If no agent-specific tools, use general MCP tools
      const generalMcpTools = await getCombinedMCPToolsForAISDK() as unknown as ToolSet;
      if (Object.keys(generalMcpTools).length > 0) {
        toolsToUse = generalMcpTools;
      }
    }

    appLogger.info(`[ChatAPI] Tools selected for LLM: ${Object.keys(toolsToUse || {}).length} tools.`, { correlationId, toolCount: Object.keys(toolsToUse || {}).length });

    // --- Tool Definition Truncation --- 
    const MAX_TOKENS_PER_TOOL_DEFINITION = parseInt(process.env.MAX_TOKENS_PER_TOOL_DEFINITION || "150");
    if (toolsToUse && Object.keys(toolsToUse).length > 0) {
      for (const toolName in toolsToUse) {
        const tool = toolsToUse[toolName];
        const toolRepresentation = JSON.stringify({ 
          name: toolName, // Corrected: Use toolName (the key) instead of tool.name
          description: tool.description, 
          parameters: tool.parameters 
        });
        // Use a temporary object for countTokens to match its expected signature
        const currentToolTokens = countTokens({role: "system", content: toolRepresentation });

        let currentToolTokensAfterMainDescTruncation = currentToolTokens;
        if (currentToolTokens > MAX_TOKENS_PER_TOOL_DEFINITION) {
          const tokensToShed = currentToolTokens - MAX_TOKENS_PER_TOOL_DEFINITION;
          if (tool.description) {
            const descriptionTokens = countTokens({role: "system", content: tool.description});
            if (descriptionTokens > tokensToShed + 5) {
              try {
                const encoder = get_encoding("cl100k_base");
                const encodedDescription = encoder.encode(tool.description);
                const targetDescriptionTokens = descriptionTokens - tokensToShed - 5; 
                const truncatedEncodedDesc = encodedDescription.slice(0, Math.max(0, targetDescriptionTokens));
                tool.description = encoder.decode(truncatedEncodedDesc) + " [...]";
                if (typeof encoder.free === 'function') encoder.free();
                appLogger.info(`[Chat API] Truncated main description for tool '${toolName}'. Original desc tokens: ${descriptionTokens}, New length: ${tool.description.length} chars.`, { correlationId });
              } catch (e) {
                appLogger.error(`[Chat API] Error truncating main description for tool '${toolName}'`, e as Error, { correlationId });
              }
            } else {
              appLogger.warn(`[Chat API] Tool '${toolName}' (tokens: ${currentToolTokens}) main description (tokens: ${descriptionTokens}) too short to shed ${tokensToShed} tokens. Will try params.`, { correlationId });
            }
          } else {
            appLogger.warn(`[Chat API] Tool '${toolName}' (tokens: ${currentToolTokens}) has no main description to truncate. Will try params.`, { correlationId });
          }

          // Recalculate token count after potential main description truncation
          const toolRepresentationAfterMainDesc = JSON.stringify({ name: toolName, description: tool.description, parameters: tool.parameters });
          currentToolTokensAfterMainDescTruncation = countTokens({role: "system", content: toolRepresentationAfterMainDesc });

          if (currentToolTokensAfterMainDescTruncation > MAX_TOKENS_PER_TOOL_DEFINITION) {
            appLogger.info(`[Chat API] Tool '${toolName}' still too long (tokens: ${currentToolTokensAfterMainDescTruncation}) after main desc truncation. Attempting to truncate parameter descriptions.`, { correlationId });
            let tokensStillToShed = currentToolTokensAfterMainDescTruncation - MAX_TOKENS_PER_TOOL_DEFINITION;
            
            if (tool.parameters && tool.parameters.properties) {
              const encoder = get_encoding("cl100k_base"); // Initialize encoder once for params
              try {
                for (const paramName in tool.parameters.properties) {
                  const param = tool.parameters.properties[paramName];
                  if (param && typeof param === 'object' && 'description' in param && typeof param.description === 'string' && param.description.length > 0) {
                    const paramDescriptionTokens = countTokens({role: "system", content: param.description});
                    if (paramDescriptionTokens > tokensStillToShed + 5) { // Can we shed enough from this param's desc?
                      const targetParamDescTokens = paramDescriptionTokens - tokensStillToShed - 5;
                      const encodedParamDesc = encoder.encode(param.description);
                      const truncatedEncodedParamDesc = encodedParamDesc.slice(0, Math.max(0, targetParamDescTokens));
                      param.description = encoder.decode(truncatedEncodedParamDesc) + " [...]";
                      appLogger.info(`[Chat API] Truncated param '${paramName}' description for tool '${toolName}'. Original tokens: ${paramDescriptionTokens}, New length: ${param.description.length} chars.`, { correlationId });
                      // Recalculate total tool tokens and check if we are done
                      const finalToolRepresentation = JSON.stringify({ name: toolName, description: tool.description, parameters: tool.parameters });
                      currentToolTokensAfterMainDescTruncation = countTokens({role: "system", content: finalToolRepresentation });
                      tokensStillToShed = currentToolTokensAfterMainDescTruncation - MAX_TOKENS_PER_TOOL_DEFINITION;
                      if (currentToolTokensAfterMainDescTruncation <= MAX_TOKENS_PER_TOOL_DEFINITION) break; // Done shedding tokens
                    } else if (paramDescriptionTokens > 5) { // Can we shed at least something meaningful?
                        // Truncate significantly if it's not enough to meet the full target, but still helps
                        const encodedParamDesc = encoder.encode(param.description);
                        const truncatedEncodedParamDesc = encodedParamDesc.slice(0, Math.max(0, Math.floor(paramDescriptionTokens / 2) - 5)); // Example: Halve it, less ellipsis
                        param.description = encoder.decode(truncatedEncodedParamDesc) + " [...]";
                        appLogger.info(`[Chat API] Partially truncated param '${paramName}' description for tool '${toolName}'. Original tokens: ${paramDescriptionTokens}, New length: ${param.description.length} chars.`, { correlationId });
                        const finalToolRepresentation = JSON.stringify({ name: toolName, description: tool.description, parameters: tool.parameters });
                        currentToolTokensAfterMainDescTruncation = countTokens({role: "system", content: finalToolRepresentation });
                        tokensStillToShed = currentToolTokensAfterMainDescTruncation - MAX_TOKENS_PER_TOOL_DEFINITION;
                        // No break here, continue to other params if still over limit
                    }
                  }
                  if (currentToolTokensAfterMainDescTruncation <= MAX_TOKENS_PER_TOOL_DEFINITION) break; // Check again after processing a param
                }
              } finally {
                 if (typeof encoder.free === 'function') encoder.free();
              }
            }
            if (currentToolTokensAfterMainDescTruncation > MAX_TOKENS_PER_TOOL_DEFINITION) {
                 appLogger.warn(`[Chat API] Tool '${toolName}' definition (tokens: ${currentToolTokensAfterMainDescTruncation}) still exceeds limit (${MAX_TOKENS_PER_TOOL_DEFINITION}) after attempting to truncate main and parameter descriptions.`, { correlationId });
            }
          }
        }
      }
    }
    // --- End Tool Definition Truncation ---

    // --- Token Budgeting for Pruning --- 
    let toolDefinitionTokens = 0;
    if (toolsToUse && Object.keys(toolsToUse).length > 0) {
      try {
        const toolDefinitionsForTokenization = Object.entries(toolsToUse).map(
          ([name, tool]) => {
            const typedTool = tool as { description?: string; parameters: JSONSchema7 }; // Assert tool structure
            return {
              name,
              description: typedTool.description,
              parameters: typedTool.parameters,
            };
          }
        );
        const toolDefinitionsString = JSON.stringify(toolDefinitionsForTokenization);
        const encoder = get_encoding("cl100k_base"); // Corrected: Use get_encoding consistently
        toolDefinitionTokens = encoder.encode(toolDefinitionsString).length;
        if (typeof encoder.free === 'function') encoder.free(); // free if it's a non-global encoder

        appLogger.info(
          `[Chat API] Estimated tool definitions token count: ${toolDefinitionTokens} for ${Object.keys(toolsToUse).length} tools.`,
          {
            correlationId,
            toolCount: Object.keys(toolsToUse).length,
            estimatedTokens: toolDefinitionTokens,
          },
        );
      } catch (e) {
        appLogger.error(
          "[Chat API] Error calculating tool definition tokens",
          e as Error,
          { correlationId },
        );
        toolDefinitionTokens = 200 * (Object.keys(toolsToUse || {}).length || 0); 
        appLogger.warn(
          `[Chat API] Using fallback tool token estimate: ${toolDefinitionTokens}`,
          { correlationId },
        );
      }
    }

    const MODEL_CONTEXT_LIMIT = parseInt(process.env.MODEL_CONTEXT_LIMIT || "8192");
    const RESPONSE_RESERVATION_TOKENS = parseInt(process.env.RESPONSE_RESERVATION_TOKENS || "1500");
    const MINIMUM_MESSAGE_TOKEN_ALLOWANCE = parseInt(process.env.MINIMUM_MESSAGE_TOKEN_ALLOWANCE || "500");

    const calculatedEffectiveMessageTokenLimit = MODEL_CONTEXT_LIMIT - toolDefinitionTokens - RESPONSE_RESERVATION_TOKENS;
    const finalEffectiveMessageTokenLimit = Math.max(calculatedEffectiveMessageTokenLimit, MINIMUM_MESSAGE_TOKEN_ALLOWANCE);

    appLogger.info(
      `[Chat API] Effective message token limit for pruning: ${finalEffectiveMessageTokenLimit}. ` +
      `(ModelLimit: ${MODEL_CONTEXT_LIMIT}, ToolTokens: ${toolDefinitionTokens}, ResponseReservation: ${RESPONSE_RESERVATION_TOKENS}, MinAllowance: ${MINIMUM_MESSAGE_TOKEN_ALLOWANCE}, CalculatedLimit: ${calculatedEffectiveMessageTokenLimit})`,
      {
        correlationId,
        finalEffectiveMessageTokenLimit,
        MODEL_CONTEXT_LIMIT,
        toolDefinitionTokens,
        RESPONSE_RESERVATION_TOKENS,
        MINIMUM_MESSAGE_TOKEN_ALLOWANCE,
        calculatedEffectiveMessageTokenLimit
      },
    );
    // --- End Token Budgeting --- 

    // Prune messages if necessary, now using the dynamic limit
    const finalMessages = pruneMessagesForPayloadSize(messagesWithAbsoluteUrls, finalEffectiveMessageTokenLimit, correlationId);

    // Select relevant tools for large conversations
    if (toolsToUse && Object.keys(toolsToUse).length > 0) {
      toolsToUse = selectRelevantTools(toolsToUse, messagesWithAbsoluteUrls.length)
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Chat API] Conversation orchestration: ${messagesWithAbsoluteUrls.length} messages → ${finalMessages.length} messages, tools: ${toolsToUse ? Object.keys(toolsToUse).length : 0}`);
    }

    // Start AI SDK operation logging
    const operationId = aiSdkLogger.startOperation(
      AiProvider.OPENROUTER,
      model || 'anthropic/claude-3.5-sonnet',
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

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Chat API] Streaming with ${model}, tools: ${toolsToUse ? Object.keys(toolsToUse).length : 0}`);
    }

    // Build streamText configuration conditionally
    const baseStreamConfig = {
      model: openrouter.chat(model || 'anthropic/claude-3.5-sonnet'),
      system: effectiveSystemPrompt,
      messages: finalMessages, // finalMessages are already CoreMessage[]
      maxTokens: 8096, // Default max tokens, can be overridden by agent settings
    } as const;

    // Only add tools and maxSteps if tools are available
    const streamTextConfig = toolsToUse && Object.keys(toolsToUse).length > 0 
      ? { ...baseStreamConfig, tools: toolsToUse, maxSteps: 10, experimental_streamData: true }
      : { ...baseStreamConfig, experimental_streamData: true, tools: {} as ToolSet }; // Ensure tools is defined even if empty

    // streamError is already declared in the outer scope

    const result = await streamText({
      ...streamTextConfig, // Use the derived config, which already includes a well-defined 'tools' property

      onChunk: (event) => { // Let TypeScript infer the type of 'event'
        const { chunk } = event;
        let chunkSize: number | undefined = undefined;

        // Assert chunk to the comprehensive LanguageModelV1StreamPart type
        const currentChunk = chunk as LanguageModelV1StreamPart;

        // @ts-expect-error TS believes 'tool-result' is not a valid type here due to SDK limitations
        if (currentChunk.type === 'tool-result' && 
            // @ts-expect-error TS infers 'never' for currentChunk here due to the above line
            'toolCallId' in currentChunk && typeof currentChunk.toolCallId === 'string' &&
            // @ts-expect-error TS infers 'never' for currentChunk here
            'toolName' in currentChunk && typeof currentChunk.toolName === 'string' &&
            'result' in currentChunk
           ) {
            const toolResultChunk = currentChunk as {
              type: 'tool-result';
              toolCallId: string;
              toolName: string;
              result: unknown;
            };
            appLogger.info(`[ChatAPI] Tool result received: ${toolResultChunk.toolName}`, {
              correlationId,
              toolCallId: toolResultChunk.toolCallId,
              toolName: toolResultChunk.toolName,
              result: toolResultChunk.result,
            });
            aiSdkLogger.logStreamingEvent(operationId, StreamingState.CHUNK_RECEIVED, {
              chunkData: toolResultChunk,
            });
        } else if (currentChunk.type === 'text-delta' && 
                   'textDelta' in currentChunk && 
                   typeof currentChunk.textDelta === 'string') {
          chunkSize = currentChunk.textDelta.length;
          appLogger.info(`[ChatAPI] Text delta received: ${currentChunk.textDelta.substring(0, 50)}...`, { correlationId });
          aiSdkLogger.logStreamingEvent(operationId, StreamingState.CHUNK_RECEIVED, { 
            chunkData: currentChunk, 
            chunkSize 
          });
        } else if (currentChunk.type === 'tool-call' && 
                   'toolCallId' in currentChunk && typeof currentChunk.toolCallId === 'string' &&
                   'toolName' in currentChunk && typeof currentChunk.toolName === 'string' &&
                   'args' in currentChunk) {
            appLogger.info(`[ChatAPI] Tool call received: ${currentChunk.toolName}`, { 
              correlationId, 
              toolCallId: currentChunk.toolCallId,
              toolName: currentChunk.toolName,
              args: currentChunk.args 
            });
            aiSdkLogger.logStreamingEvent(operationId, StreamingState.CHUNK_RECEIVED, { 
              chunkData: currentChunk 
            });
        // @ts-expect-error TS believes 'tool-call-streaming-start' is not a valid type here
        } else if (currentChunk.type === 'tool-call-streaming-start' && 
                   // @ts-expect-error TS infers 'never' for currentChunk here
                   'toolCallId' in currentChunk && typeof currentChunk.toolCallId === 'string' &&
                   // @ts-expect-error TS infers 'never' for currentChunk here
                   'toolName' in currentChunk && typeof currentChunk.toolName === 'string') {
            const toolCallStreamingStartChunk = currentChunk as {
              type: 'tool-call-streaming-start';
              toolCallId: string;
              toolName: string;
            };
            appLogger.info(`[ChatAPI] Tool call streaming start: ${toolCallStreamingStartChunk.toolName}`, { 
              correlationId, 
              toolCallId: toolCallStreamingStartChunk.toolCallId, 
              toolName: toolCallStreamingStartChunk.toolName 
            });
            aiSdkLogger.logStreamingEvent(operationId, StreamingState.CHUNK_RECEIVED, { 
              chunkData: toolCallStreamingStartChunk 
            });
        } else if (currentChunk.type === 'tool-call-delta' && 
                   'toolCallId' in currentChunk && typeof currentChunk.toolCallId === 'string' &&
                   'toolName' in currentChunk && typeof currentChunk.toolName === 'string' &&
                   'argsTextDelta' in currentChunk && typeof currentChunk.argsTextDelta === 'string') {
            appLogger.info(`[ChatAPI] Tool call delta: ${currentChunk.toolName}, delta: ${currentChunk.argsTextDelta.substring(0,30)}...`, { 
              correlationId, 
              toolCallId: currentChunk.toolCallId, 
              toolName: currentChunk.toolName, 
              argsTextDelta: currentChunk.argsTextDelta 
            });
            aiSdkLogger.logStreamingEvent(operationId, StreamingState.CHUNK_RECEIVED, { 
              chunkData: currentChunk 
            });
        } else {
          // Default case for any other unhandled chunk types
          let chunkType = 'unknown';
          if (typeof currentChunk === 'object' && currentChunk !== null && 'type' in currentChunk && typeof (currentChunk as { type?: unknown }).type === 'string') {
            chunkType = (currentChunk as { type: string }).type;
          } else if (typeof currentChunk === 'object' && currentChunk !== null && 'type' in currentChunk) {
            appLogger.warn(`[ChatAPI] Chunk has a 'type' property but it's not a string.`, { correlationId, typeValue: (currentChunk as {type: unknown}).type });
          }
          appLogger.info(`[ChatAPI] Received chunk of unhandled type: ${chunkType}`, { correlationId, chunkData: currentChunk });
          aiSdkLogger.logStreamingEvent(operationId, StreamingState.CHUNK_RECEIVED, { 
            chunkData: currentChunk 
          });
        }
      },
      // onToolCall: ({ toolCall }: { toolCall: ToolCallPart }) => {
      //   appLogger.info(`[ChatAPI] Tool call received in stream: ${toolCall.toolName}`, { correlationId, toolCall });
      // },
      // // The structure of 'result' can vary; using 'unknown' is safer than 'any'.
      // // Consider adding type guards or more specific typing if the structure of toolResult.result is known and consistent.
      // onToolResult: ({ toolResult }: { toolResult: { toolCallId: string, toolName: string, result: unknown } }) => {
      //   appLogger.info(`[ChatAPI] Tool result received in stream: ${toolResult.toolName}`, { correlationId, toolResult });
      // },
      onFinish: async (event: { finishReason: FinishReason; usage: LanguageModelUsage; text?: string; toolCalls?: ToolCallPart[]; toolResults?: Array<{ toolCallId: string; toolName: string; args: Record<string, unknown>; result: unknown; }>; rawResponse?: { text?: string; toolCalls?: ToolCallPart[]; }; }) => {
        try {
          appLogger.info('[ChatAPI] Stream finished.', { correlationId, usage: event.usage, finishReason: event.finishReason });
          aiSdkLogger.endOperation(operationId, { 
            response: event.text, 
            tokenUsage: event.usage ? { 
              promptTokens: event.usage.promptTokens, 
              completionTokens: event.usage.completionTokens, 
              totalTokens: event.usage.totalTokens 
            } : undefined 
          });
          
          const finalContentForSdk: (TextPart | ToolCallPart)[] = [];
            const finalText = event.text ?? event.rawResponse?.text;
            const finalToolCalls = event.toolCalls ?? event.rawResponse?.toolCalls;

            if (finalText) finalContentForSdk.push({ type: 'text', text: finalText });
            if (finalToolCalls) finalContentForSdk.push(...finalToolCalls);

            if (finalContentForSdk.length > 0) {
                await saveFinalAssistantMessage(chatId, [{ role: 'assistant', content: finalContentForSdk }]);
                appLogger.aiSdk.info('Assistant messages stored successfully.', { correlationId, chatId });
            } else {
                appLogger.aiSdk.info('No text or tool calls from assistant to save.', { correlationId, chatId });
            }
        } catch (error) { 
          const err = error instanceof Error ? error : new Error(String(error));
          appLogger.aiSdk.error('Error in onFinish callback:', err, { correlationId });
          aiSdkLogger.endOperation(operationId, { error: err });
        }
      },
      onError: (errorEvent: { error: unknown }) => { 
        const errorForCallback = errorEvent.error instanceof Error ? errorEvent.error : new Error(String(errorEvent.error));
        streamError = errorForCallback; 
        aiSdkLogger.endOperation(operationId, { error: errorForCallback });
        appLogger.error('[ChatAPI] Stream error:', { correlationId, error: errorForCallback.message, stack: errorForCallback.stack });
      }
    });

    // Log streaming start
    aiSdkLogger.logStreamingEvent(operationId, StreamingState.STARTED);

    if (streamError) {
      appLogger.aiSdk.error('Stream error occurred before client response', streamError, { correlationId });
      // If an error occurred synchronously or was set in onError, throw it to be caught by the main try/catch
      throw streamError;
    }

    const originalResponse = result.toDataStreamResponse();
    
    // Optionally attach chatId in a custom header.
    const headers = new Headers(originalResponse.headers)
    headers.set("X-Chat-Id", chatId)
    headers.set("X-Correlation-Id", correlationId || '')

    appLogger.http.info('Chat API request completed successfully', { 
      correlationId, 
      chatId,
      status: originalResponse.status
    });

    return new Response(originalResponse.body, {
      status: originalResponse.status,
      headers,
    })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error"
    
    appLogger.http.error("Error in /api/chat:", err as Error, { correlationId })
    appLogger.aiSdk.error("Chat completion failed:", err as Error, { correlationId })
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-Id': correlationId || ''
        }
      }
    )
  }
}
