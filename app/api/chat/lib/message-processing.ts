import { Message as MessageAISDK } from "ai";
import { getManagedServersInfo } from "@/lib/mcp/mcpManager";
import { reportMCPError } from "@/lib/mcp/enhanced-integration";
import { getEnhancedMCPToolsForAISDK } from "@/lib/mcp/enhanced-tools-access";
import { prisma } from "@/lib/prisma";
import { appLogger } from '@/lib/logger';
import { getCurrentCorrelationId } from '@/lib/logger/correlation';
import { 
  parseToolMentions, 
  stripToolMentions, 
  parsePromptMentions, 
  stripPromptMentions, 
} from "@/app/types/tool-mention";
import { truncateToolOutput } from "./token-management";
import { mentionCacheManager } from "@/lib/mcp/modules/mention-cache-manager";

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

  appLogger.debug(`[processToolMentions] Found ${toolMentions.length} tool mentions to process`, { correlationId: getCurrentCorrelationId(), messageCount: toolMentions.length });

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
  const combinedTools = await getEnhancedMCPToolsForAISDK();

  const processedMessages = [...messages];
  const toolExecutionPromises = toolMentions.map(async (mention) => {
    appLogger.debug(`[processToolMentions] Preparing tool for execution: ${mention.toolName || 'unknown'}`, { correlationId: getCurrentCorrelationId(), originalToolName: mention.toolName });
    const matchingTool = availableTools.find(tool => tool.name === mention.toolName);

    if (!matchingTool) {
      appLogger.warn(`[processToolMentions] Tool not found: ${mention.toolName || 'unknown'}`, {
        correlationId: getCurrentCorrelationId(),
        originalToolName: mention.toolName,
        args: { availableTools: availableTools.map(t => t.name) }
      });
      return {
        type: 'error' as const,
        mention,
        message: `Tool ${mention.toolName || 'unknown'} not found.`
      };
    }

    let toolFunction = combinedTools[matchingTool.fullId];
    
    // FALLBACK: If tool not in optimized selection, load all tools as fallback
    if (!toolFunction || typeof toolFunction.execute !== 'function') {
      appLogger.info(`[processToolMentions] Tool ${matchingTool.fullId} not in optimized selection, falling back to full tool loading`, {
        correlationId: getCurrentCorrelationId(),
        toolCallId: matchingTool.fullId,
        messageCount: Object.keys(combinedTools).length
      });
      
      try {
        // Get ALL available tools as fallback
        const allTools = await getEnhancedMCPToolsForAISDK();
        toolFunction = allTools[matchingTool.fullId];
        
        if (toolFunction && typeof toolFunction.execute === 'function') {
          // Add to current collection for future use in this conversation
          combinedTools[matchingTool.fullId] = toolFunction;
          appLogger.info(`[processToolMentions] Successfully loaded missing tool via fallback: ${matchingTool.fullId}`, {
            correlationId: getCurrentCorrelationId(),
            toolCallId: matchingTool.fullId
          });
        }
      } catch (fallbackError) {
        appLogger.error(`[processToolMentions] Fallback tool loading failed for ${matchingTool.fullId}`, {
          correlationId: getCurrentCorrelationId(),
          toolCallId: matchingTool.fullId,
          error: fallbackError
        });
      }
    }
    
    // Final check after fallback attempt
    if (!toolFunction || typeof toolFunction.execute !== 'function') {
      appLogger.warn(`[processToolMentions] Tool function not available even after fallback: ${matchingTool.fullId}`, {
        correlationId: getCurrentCorrelationId(),
        toolCallId: matchingTool.fullId,
        args: { availableCombinedTools: Object.keys(combinedTools) }
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
        toolCallId: matchingTool.fullId,
        args: mention.parameters
      });

      const result = await toolFunction.execute(mention.parameters, {
        toolCallId: `tool-call-${Date.now()}-${Math.random()}`,
        messages: [] // Assuming messages are not needed for individual tool execution context here
      });

      const correlationId = getCurrentCorrelationId() || 'unknown';
      const fullContent = JSON.stringify(result, null, 2);
      appLogger.debug(`[processToolMentions] Full tool output for '${mention.toolName || 'unknown'}'`, {
        correlationId,
        originalToolName: mention.toolName || 'unknown',
        args: { outputLength: fullContent.length }
      });

      const processedContent = truncateToolOutput(fullContent, mention.toolName || 'unknown', correlationId);
      appLogger.info(`[processToolMentions] Tool ${matchingTool.fullId} executed successfully`, { correlationId: getCurrentCorrelationId(), toolCallId: matchingTool.fullId });
      
      return {
        type: 'success' as const,
        mention,
        content: processedContent
      };
    } catch (error) {
      appLogger.error(`[processToolMentions] Error executing tool ${matchingTool.fullId}`, {
        correlationId: getCurrentCorrelationId(),
        toolCallId: matchingTool.fullId,
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

  appLogger.debug(`[processPromptMentions] Found ${promptMentions.length} prompt mentions`, { correlationId: getCurrentCorrelationId(), operationId: `prompt_mentions_${promptMentions.length}_found` });

  // Check cache first for prompt content
  const promptIdentifiers = promptMentions.map(mention => ({
    promptId: mention.promptId,
    promptName: mention.promptName
  }));
  
  const cachedPromptContent = await mentionCacheManager.getCachedPromptContent(promptIdentifiers);
  
  if (cachedPromptContent) {
    // Cache HIT - use cached results
    const cleanedContent = stripPromptMentions(lastMessage.content);
    const processedMessages = [...messages];
    
    if (cleanedContent) {
      processedMessages[processedMessages.length - 1] = {
        ...lastMessage,
        content: cleanedContent,
      };
    } else {
      processedMessages[processedMessages.length - 1] = {
        ...lastMessage,
        content: 'I would like you to apply the mentioned rules to our conversation.'
      };
    }

    appLogger.info(`[processPromptMentions] Used cached prompt content`, { 
      correlationId: getCurrentCorrelationId(),
      operationId: `prompt_cache_hit_${promptIdentifiers.length}_prompts`
    });
    
    return { 
      processedMessages, 
      enhancedSystemPrompt: cachedPromptContent.enhancedSystemPrompt 
    };
  }

  let allPrompts: { id: string; name: string; system_prompt: string | null; }[] = [];
  try {
    // Cache MISS - fetch prompts from database
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
      appLogger.debug(`[processPromptMentions] Found prompt: ${prompt.name}`, { 
        correlationId: getCurrentCorrelationId(), 
        args: { promptName: prompt.name, slug: mention.promptSlug }
      });
      if (prompt.system_prompt) {
        promptContents.push(prompt.system_prompt);
      }
    } else {
      appLogger.warn(`[processPromptMentions] Prompt not found for mention: ${mention.promptSlug}`, {
        correlationId: getCurrentCorrelationId(),
        args: { slug: mention.promptSlug }
      });
    }
  }

  const enhancedSystemPrompt = promptContents.join('\n\n---\n\n');
  
  // Cache the processed prompt results for future requests
  await mentionCacheManager.setCachedPromptContent(promptIdentifiers, enhancedSystemPrompt, allPrompts);
  
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

  appLogger.info(`[processPromptMentions] Enhanced system prompt with ${promptContents.length} prompt(s)`, { correlationId: getCurrentCorrelationId(), operationId: `prompt_processing_complete_${promptContents.length}_prompts` });
  return { processedMessages, enhancedSystemPrompt };
}