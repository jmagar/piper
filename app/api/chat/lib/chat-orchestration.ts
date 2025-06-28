import { Message as MessageAISDK, ToolSet } from 'ai';
import { loadAgentCached } from "@/lib/agents/load-agent";
import { getEnhancedMCPToolsForAISDK } from "@/lib/mcp/enhanced-tools-access";
import { trackSpecialAgentUsage } from "../api";
import { appLogger } from '@/lib/logger';
import { getCurrentCorrelationId } from '@/lib/logger/correlation';
import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config";
import { getOptimizedSystemPrompt } from "@/lib/mcp/modules/system-prompt-optimizer";

import {
  processToolMentions,
  processPromptMentions,
} from "./message-processing"

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
  userId?: string; // Added to match ChatRequestSchema in route.ts
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
// CONVERSATION CONTEXT ANALYSIS
// =============================================================================

/**
 * Extract conversation context for intelligent tool selection
 */
function extractConversationContext(messages: MessageAISDK[]): {
  messageCount: number;
  recentMessages: Array<{ role: string; content: string }>;
  mentionedTools: string[];
  messageLength: number;
} {
  const messageCount = messages.length;
  const recentMessages = messages.slice(-5).map(msg => ({
    role: msg.role,
    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
  }));
  
  // Extract tool mentions from recent messages
  const mentionedTools: string[] = [];
  for (const message of recentMessages) {
    // Look for @tool patterns, direct tool names, or tool function calls
    const toolMatches = message.content.match(/@\w+|\b\w*tool\w*\b|function_calls?|tools?\./gi);
    if (toolMatches) {
      mentionedTools.push(...toolMatches.map(match => match.replace('@', '').toLowerCase()));
    }
  }
  
  const messageLength = recentMessages.reduce((sum, msg) => sum + msg.content.length, 0);
  
  return {
    messageCount,
    recentMessages,
    mentionedTools: [...new Set(mentionedTools)], // Remove duplicates
    messageLength
  };
}

// =============================================================================
// AGENT CONFIGURATION
// =============================================================================

/**
 * Load and configure agent settings with caching
 */
async function loadAgentConfiguration(agentId?: string): Promise<Record<string, unknown> | null> {
  if (!agentId) {
    return null;
  }

  // Use cached agent loading for massive performance improvement
  const agentConfig = await loadAgentCached(agentId);
  if (!agentConfig) {
    appLogger.warn(`[ChatOrchestration] Agent with ID '${agentId}' not found.`, { 
      correlationId: getCurrentCorrelationId() 
    });
    return null;
  }

  appLogger.debug('[ChatOrchestration] Agent configuration loaded successfully', {
    correlationId: getCurrentCorrelationId()
  });

  return agentConfig;
}

// =============================================================================
// ENHANCED TOOL CONFIGURATION
// =============================================================================

/**
 * Enhanced tool configuration with intelligent selection and caching
 */
async function configureToolsEnhanced(
  agentConfig: Record<string, unknown> | null,
  conversationContext: {
    messageCount: number;
    recentMessages: Array<{ role: string; content: string }>;
    mentionedTools: string[];
    messageLength: number;
  }
): Promise<ToolSet | undefined> {
  const correlationId = getCurrentCorrelationId();
  const startTime = Date.now();

  try {
    // Handle agent-specific tool configurations first
    if (agentConfig?.tools) {
      await trackSpecialAgentUsage();
             appLogger.info(`[ChatOrchestration] Using agent-specific tools (${Object.keys(agentConfig.tools as ToolSet).length} tools)`, {
         correlationId
       });
      return agentConfig.tools as unknown as ToolSet;
    }

    if (agentConfig?.mcpConfig) {
      const mcpConfig = agentConfig.mcpConfig as { server?: string | string[] };
      if (mcpConfig.server) {
        // Get all available tools first for filtering
        const allTools = await getEnhancedMCPToolsForAISDK();
        
        const serverKeys = Array.isArray(mcpConfig.server) ? mcpConfig.server : [mcpConfig.server];
        const filteredTools: ToolSet = {};
        
        for (const key of Object.keys(allTools)) {
          if (serverKeys.some(serverKey => key.startsWith(`${serverKey}_`))) {
            filteredTools[key] = allTools[key];
          }
        }
        
                 appLogger.info(`[ChatOrchestration] Filtered MCP tools for agent: ${Object.keys(allTools).length} → ${Object.keys(filteredTools).length} tools (servers: ${serverKeys.join(', ')})`, {
           correlationId
         });
        
        return Object.keys(filteredTools).length > 0 ? filteredTools : undefined;
      }
    }

    // Use Enhanced MCP direct access with conversation context
    const intelligentlySelectedTools = await getEnhancedMCPToolsForAISDK();
    
    const duration = Date.now() - startTime;
    const toolCount = Object.keys(intelligentlySelectedTools).length;
    
    // ENHANCED DIAGNOSTIC LOGGING for MCP tool access issue
    appLogger.info(`[ChatOrchestration] 🎯 Enhanced tool configuration completed: ${toolCount} tools (${conversationContext.messageCount} messages) in ${duration}ms`, {
      correlationId,
      toolCount,
      toolNames: Object.keys(intelligentlySelectedTools),
      conversationContext: {
        messageCount: conversationContext.messageCount,
        mentionedTools: conversationContext.mentionedTools,
        messageLength: conversationContext.messageLength
      }
    });
    
    // Log detailed tool information for debugging
    if (toolCount > 0) {
      appLogger.debug(`[ChatOrchestration] 🔧 Tool details for AI SDK:`, {
        correlationId,
                 tools: Object.keys(intelligentlySelectedTools).map(toolName => {
           const tool = intelligentlySelectedTools[toolName] as Record<string, unknown>;
           return {
             name: toolName,
             hasDescription: !!(tool?.description),
             hasParameters: !!(tool?.parameters),
             type: typeof tool
           };
         })
      });
    } else {
      appLogger.warn(`[ChatOrchestration] ⚠️ No tools loaded for AI SDK - this may cause assistant to claim no tool access`, {
        correlationId,
        conversationContext
      });
    }

    return toolCount > 0 ? intelligentlySelectedTools : undefined;
    
  } catch (error) {
    appLogger.error('[ChatOrchestration] Error in enhanced tool configuration', {
      correlationId,
      error: error as Error
    });
    
    // Fallback to Enhanced MCP direct access
    const allTools = await getEnhancedMCPToolsForAISDK();
    return Object.keys(allTools).length > 0 ? allTools : undefined;
  }
}



// =============================================================================
// SYSTEM PROMPT OPTIMIZATION
// =============================================================================

/**
 * Generate optimized system prompt with caching
 */
async function generateOptimizedSystemPrompt(
  messages: MessageAISDK[],
  availableTools: string[],
  agentConfig: Record<string, unknown> | null,
  enhancedSystemPrompt: string
): Promise<string> {
  try {
    // Determine base system prompt (agent or default)
    const baseSystemPrompt = (agentConfig?.systemPrompt as string) || SYSTEM_PROMPT_DEFAULT;
    
    // Generate context-aware optimized prompt
    const optimizedPrompt = await getOptimizedSystemPrompt(
      messages,
      availableTools,
      baseSystemPrompt
    );
    
    // Combine with enhanced system prompt from @prompt mentions if any
    if (enhancedSystemPrompt) {
      return `${optimizedPrompt}\n\n---\n\n${enhancedSystemPrompt}`;
    }
    
    return optimizedPrompt;
    
  } catch (error) {
    appLogger.error('[ChatOrchestration] Error generating optimized system prompt', {
      correlationId: getCurrentCorrelationId(),
      messageCount: messages.length,
      hasAgent: !!agentConfig,
      error: error as Error
    });
    
    // Fallback to original logic
    const baseSystemPrompt = (agentConfig?.systemPrompt as string) || SYSTEM_PROMPT_DEFAULT;
    return enhancedSystemPrompt ? `${baseSystemPrompt}\n\n---\n\n${enhancedSystemPrompt}` : baseSystemPrompt;
  }
}

// =============================================================================
// MESSAGE VALIDATION
// =============================================================================

/**
 * Validate and sanitize messages to prevent AI_InvalidPromptError
 * This is the final safeguard to ensure no empty messages reach the AI SDK
 */
function validateAndSanitizeMessages(messages: MessageAISDK[], correlationId?: string): MessageAISDK[] {
  const definiteCorrelationId = correlationId || getCurrentCorrelationId();
  
  const validatedMessages = messages.map((message, index) => {
    // Check for empty content
    if (!message.content || 
        (typeof message.content === 'string' && message.content.trim() === '') ||
        (Array.isArray(message.content) && message.content.length === 0)) {
      
      appLogger.warn(`[validateAndSanitizeMessages] Found empty message at index ${index}, providing fallback content`, {
        correlationId: definiteCorrelationId,
        args: {
          messageId: message.id,
          role: message.role,
          originalContent: message.content,
          messageIndex: index
        }
      });
      
      // Provide appropriate fallback content based on role
      let fallbackContent: string;
      switch (message.role) {
        case 'user':
          fallbackContent = 'I would like to continue our conversation.';
          break;
        case 'assistant':
          fallbackContent = 'I understand. How can I help you further?';
          break;
        case 'system':
          fallbackContent = 'You are a helpful AI assistant.';
          break;
        default:
          fallbackContent = 'Message content was processed.';
      }
      
      return {
        ...message,
        content: fallbackContent
      };
    }
    
    return message;
  });
  
  // Final validation: ensure we have at least one message
  if (validatedMessages.length === 0) {
    appLogger.error(`[validateAndSanitizeMessages] No messages remaining after validation! Creating emergency fallback message.`, {
      correlationId: definiteCorrelationId,
      args: {
        originalMessageCount: messages.length
      }
    });
    
    return [{
      id: `emergency-fallback-${Date.now()}`,
      role: 'user' as const,
      content: 'Hello, I would like to start a conversation.'
    }];
  }
  
  appLogger.debug(`[validateAndSanitizeMessages] Validation complete: ${messages.length} → ${validatedMessages.length} messages`, {
    correlationId: definiteCorrelationId
  });
  
  return validatedMessages;
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
  const { processedMessages: finalProcessedMessages, enhancedSystemPrompt } = 
    await processPromptMentions(messagesAfterTools);

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
    
    // Step 3: Process attachment URLs
    const messagesWithAbsoluteUrls = processAttachmentUrls(processedMessages);
    
    // Step 4: Configure tools
    let toolsToUse = await configureToolsEnhanced(agentConfig, extractConversationContext(messages));
    
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
      correlationId
    });

    // Step 5: Generate optimized system prompt with caching
    const availableToolNames = toolsToUse ? Object.keys(toolsToUse) : [];
    const effectiveSystemPrompt = await generateOptimizedSystemPrompt(
      messagesWithAbsoluteUrls,
      availableToolNames,
      agentConfig,
      enhancedSystemPrompt
    );

    // Step 6: Calculate token budget
    const toolDefinitionTokens = estimateToolDefinitionTokens(toolsToUse || {});
    const tokenBudget = calculateTokenBudget(toolDefinitionTokens);

    appLogger.info(
      `[ChatOrchestration] Token budget calculated. Message limit: ${tokenBudget.messageLimit} tokens.`,
      {
        correlationId
      }
    );

    // Step 7: Prune messages if necessary
    const prunedMessages = pruneMessagesForPayloadSize(
      messagesWithAbsoluteUrls, 
      tokenBudget.messageLimit, 
      correlationId
    );

    // Step 8: Validate messages to prevent AI_InvalidPromptError
    const finalMessages = validateAndSanitizeMessages(prunedMessages, correlationId);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[ChatOrchestration] Pipeline complete: ${messagesWithAbsoluteUrls.length} messages → ${finalMessages.length} messages, tools: ${toolsToUse ? Object.keys(toolsToUse).length : 0}`);
    }

    return {
      finalMessages,
      effectiveSystemPrompt,
      toolsToUse,
      tokenBudget
    };

  } catch (error) {
    // Enhanced error logging with more context
    appLogger.error('[ChatOrchestration] Error in chat processing pipeline', { 
      correlationId,
      error: error as Error,
      chatId: request.chatId,
      model: request.model,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    });
    
    // Log additional debugging info in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ChatOrchestration] Detailed error context:', {
        error: error,
        stack: error instanceof Error ? error.stack : undefined,
        correlationId,
        request: {
          chatId: request.chatId,
          model: request.model,
          agentId: request.agentId,
          messageCount: request.messages.length
        }
      });
    }
    
    // CRITICAL: Provide fallback data to prevent empty messages/system prompts
    appLogger.warn('[ChatOrchestration] Providing emergency fallback data to prevent AI_InvalidPromptError', {
      correlationId,
      originalMessageCount: messages.length
    });
    
    // Create emergency fallback messages
    const fallbackMessages = messages.length > 0 
      ? validateAndSanitizeMessages(messages, correlationId) // Try to salvage original messages
      : [{
          id: `emergency-fallback-${Date.now()}`,
          role: 'user' as const,
          content: 'Hello, I would like to start a conversation.'
        }];
    
    // Create emergency fallback system prompt
    const fallbackSystemPrompt = request.systemPrompt || 'You are a helpful AI assistant.';
    
    // Return minimal working configuration
    return {
      finalMessages: fallbackMessages,
      effectiveSystemPrompt: fallbackSystemPrompt,
      toolsToUse: undefined, // No tools in emergency mode
      tokenBudget: {
        modelLimit: 8192,
        toolTokens: 0,
        responseReservation: 1000,
        messageLimit: 7192
      }
    };
  }
}