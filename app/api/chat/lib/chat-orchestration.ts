import { Message as MessageAISDK, ToolSet } from 'ai';
import { loadAgent } from "@/lib/agents/load-agent";
import { getCombinedMCPToolsForAISDK } from "@/lib/mcp/mcpManager";
import { trackSpecialAgentUsage } from "../api";
import { appLogger } from '@/lib/logger';
import { getCurrentCorrelationId } from '@/lib/logger/correlation';

import { processToolMentions, processUrlMentions, processPromptMentions, processFileMentions } from './message-processing';
import { pruneMessagesForPayloadSize } from './message-pruning';
import { truncateToolDefinitions, estimateToolDefinitionTokens, calculateTokenBudget } from './token-management';
import { selectRelevantTools, optimizeToolDefinitions } from './tool-management';


// =============================================================================
// TYPES
// =============================================================================

export type ChatRequest = {
  messages: MessageAISDK[];
  chatId: string;
  model: string;
  systemPrompt: string;
  agentId?: string;
};

export type ProcessedChatData = {
  finalMessages: MessageAISDK[];
  effectiveSystemPrompt: string;
  toolsToUse: ToolSet | undefined;
  tokenBudget: {
    modelLimit: number;
    toolTokens: number;
    responseReservation: number;
    messageLimit: number;
  };
};

// =============================================================================
// AGENT CONFIGURATION
// =============================================================================

/**
 * Load and configure agent settings
 */
async function loadAgentConfiguration(agentId?: string): Promise<Record<string, unknown> | null> {
  if (!agentId) {
    return null;
  }

  const agentConfig = await loadAgent(agentId);
  appLogger.aiSdk.debug('Loaded agent configuration', { 
    correlationId: getCurrentCorrelationId(), 
    agentId, 
    hasSystemPrompt: !!agentConfig?.systemPrompt 
  });

  return agentConfig;
}

// =============================================================================
// TOOL CONFIGURATION
// =============================================================================

/**
 * Configure tools based on agent settings
 */
async function configureTools(agentConfig: Record<string, unknown> | null): Promise<ToolSet | undefined> {
  const allTools = await getCombinedMCPToolsForAISDK() as unknown as ToolSet;

  if (agentConfig?.tools) {
    await trackSpecialAgentUsage();
    // If agent has specific tools defined, use them.
    // This assumes agent.tools is a complete ToolSet.
    return agentConfig.tools as unknown as ToolSet;
  }

  if (agentConfig?.mcpConfig) {
    const mcpConfig = agentConfig.mcpConfig as { server?: string | string[] };
    if (mcpConfig.server) {
      const serverKeys = Array.isArray(mcpConfig.server) ? mcpConfig.server : [mcpConfig.server];
      const filteredTools: ToolSet = {};
      for (const key of Object.keys(allTools)) {
        // The tool key is prefixed with serverKey_
        if (serverKeys.some(serverKey => key.startsWith(`${serverKey}_`))) {
          filteredTools[key] = allTools[key];
        }
      }
      appLogger.info(`[ChatOrchestration] Filtered MCP tools for agent. Found ${Object.keys(filteredTools).length} tools for servers: ${serverKeys.join(', ')}`);
      return Object.keys(filteredTools).length > 0 ? filteredTools : undefined;
    }
  }

  // If no agent-specific tools, use all available MCP tools
  if (Object.keys(allTools).length > 0) {
    return allTools;
  }

  return undefined;
}

// =============================================================================
// MESSAGE PROCESSING PIPELINE
// =============================================================================

/**
 * Process messages through the complete pipeline
 */
async function processMessagesPipeline(
  messages: MessageAISDK[]
): Promise<{ processedMessages: MessageAISDK[], enhancedSystemPrompt: string }> {
  // Step 1: Process tool mentions
  const messagesAfterTools = await processToolMentions(messages);
  
  // Step 2: Process prompt mentions and enhance system prompt  
  const { processedMessages: messagesWithPrompts, enhancedSystemPrompt } = 
    await processPromptMentions(messagesAfterTools);
  
  // Step 3: Process URL mentions
  const messagesAfterUrls = await processUrlMentions(messagesWithPrompts);

  // Step 4: Process File mentions
  const finalProcessedMessages = await processFileMentions(messagesAfterUrls);

  return {
    processedMessages: finalProcessedMessages,
    enhancedSystemPrompt
  };
}

/**
 * Convert relative attachment URLs to absolute URLs for AI model access
 */
function processAttachmentUrls(messages: MessageAISDK[]): MessageAISDK[] {
  return messages.map((message) => {
    // ✅ AI SDK PATTERN: Files are already handled by AI SDK, just pass through
    return message;
  });
}

// =============================================================================
// MAIN ORCHESTRATION
// =============================================================================

/**
 * Orchestrate the complete chat processing pipeline
 */
export async function orchestrateChatProcessing(request: ChatRequest): Promise<ProcessedChatData> {
  const correlationId = getCurrentCorrelationId();
  const { messages, agentId } = request;

  try {
    // Step 1: Load agent configuration
    const agentConfig = await loadAgentConfiguration(agentId);
    
    // Step 2: Process messages through pipeline
    const { processedMessages, enhancedSystemPrompt } = await processMessagesPipeline(messages);
    // effectiveSystemPrompt will be the enhancedSystemPrompt from the pipeline
    
    // Step 4: Process attachment URLs
    const messagesWithAbsoluteUrls = processAttachmentUrls(processedMessages);
    
    // Step 5: Configure tools
    let toolsToUse = await configureTools(agentConfig);
    
    if (toolsToUse && Object.keys(toolsToUse).length > 0) {
      // Optimize tool definitions to prevent context overflow
      toolsToUse = optimizeToolDefinitions(toolsToUse, correlationId || 'unknown');
      
      // Select relevant tools for large conversations
      toolsToUse = selectRelevantTools(toolsToUse, messagesWithAbsoluteUrls.length);

      // Truncate individual tool definitions if they are too verbose
      if (toolsToUse && Object.keys(toolsToUse).length > 0) {
        toolsToUse = truncateToolDefinitions(toolsToUse);
      }
    }

    appLogger.info(`[ChatOrchestration] Tools selected for LLM: ${Object.keys(toolsToUse || {}).length} tools.`, { 
      correlationId, 
      toolCount: Object.keys(toolsToUse || {}).length 
    });

    // Step 6: Calculate token budget
    const toolDefinitionTokens = estimateToolDefinitionTokens(toolsToUse || {});
    const tokenBudget = calculateTokenBudget(toolDefinitionTokens);

    appLogger.info(
      `[ChatOrchestration] Token budget calculated. Message limit: ${tokenBudget.messageLimit} tokens.`,
      {
        correlationId,
        ...tokenBudget,
        toolDefinitionTokens
      }
    );

    // Step 7: Prune messages if necessary
    const finalMessages = pruneMessagesForPayloadSize(
      messagesWithAbsoluteUrls, 
      tokenBudget.messageLimit, 
      correlationId
    );

    if (process.env.NODE_ENV === 'development') {
      console.log(`[ChatOrchestration] Pipeline complete: ${messagesWithAbsoluteUrls.length} messages → ${finalMessages.length} messages, tools: ${toolsToUse ? Object.keys(toolsToUse).length : 0}`);
    }

    return {
      finalMessages,
      effectiveSystemPrompt: enhancedSystemPrompt,
      toolsToUse,
      tokenBudget
    };

  } catch (error) {
    // Enhanced error logging with more context
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : typeof error;
    
    appLogger.error('[ChatOrchestration] Error in chat processing pipeline:', error as Error, { 
      correlationId,
      errorMessage,
      errorStack,
      errorName,
      requestContext: {
        chatId: request.chatId,
        model: request.model,
        agentId: request.agentId,
        messageCount: request.messages.length
      }
    });
    
    // Log additional debugging info in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ChatOrchestration] Detailed error context:', {
        error: error,
        stack: errorStack,
        correlationId,
        request: {
          chatId: request.chatId,
          model: request.model,
          agentId: request.agentId,
          messageCount: request.messages.length
        }
      });
    }
    
    throw error;
  }
}