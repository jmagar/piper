import { ToolSet } from 'ai';

import { appLogger } from '@/lib/logger';
import { getCurrentCorrelationId } from '@/lib/logger/correlation';
import { TOKEN_CONFIG, countTokensForString, truncateStringByTokens } from './token-management';

// =============================================================================
// CONFIGURATION
// =============================================================================

const TOOL_CONFIG = {
  // Tool Limits
  MAX_TOOLS_LONG_CONVERSATION: 25,
  MAX_TOOLS_MEDIUM_CONVERSATION: 50,
  
  // Conversation Thresholds
  MEDIUM_CONVERSATION_THRESHOLD: 10,
  LONG_CONVERSATION_THRESHOLD: 15,
} as const;

// =============================================================================
// TOOL SELECTION
// =============================================================================

/**
 * Select relevant tools for large conversations to prevent payload issues
 */
/**
 * Selects a subset of tools based on conversation length using heuristics.
 * For very long conversations, it prioritizes tools deemed more 'essential' (e.g., file, search related)
 * and 'general' (tools without server prefixes in their names).
 * NOTE: This is a heuristic approach. More sophisticated, context-aware tool selection (e.g., semantic search
 * against tool descriptions based on recent message content) could be explored in the future if this
 * heuristic proves insufficient, but would add significant complexity.
 */
export function selectRelevantTools(allTools: ToolSet, messageCount: number): ToolSet {
  const toolEntries = Object.entries(allTools);
  
  if (messageCount <= TOOL_CONFIG.MEDIUM_CONVERSATION_THRESHOLD) {
    return allTools; // Short conversation: use all tools
  } else if (messageCount <= TOOL_CONFIG.LONG_CONVERSATION_THRESHOLD) {
    // Medium conversation: limit tools
    if (toolEntries.length <= TOOL_CONFIG.MAX_TOOLS_MEDIUM_CONVERSATION) {
      return allTools;
    }
    
    // Prioritize general tools over server-specific ones
    const prioritizedTools = toolEntries
      .sort(([keyA], [keyB]) => {
        // Prioritize tools without server prefixes (general tools)
        const isGeneralA = !keyA.includes('_');
        const isGeneralB = !keyB.includes('_');
        if (isGeneralA && !isGeneralB) return -1;
        if (!isGeneralA && isGeneralB) return 1;
        return 0;
      })
      .slice(0, TOOL_CONFIG.MAX_TOOLS_MEDIUM_CONVERSATION);
    
    return Object.fromEntries(prioritizedTools) as ToolSet;
  } else {
    // Long conversation: minimal essential tools
    if (toolEntries.length <= TOOL_CONFIG.MAX_TOOLS_LONG_CONVERSATION) {
      return allTools;
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
               !key.includes('_'); // General tools without server prefix
      })
      .slice(0, TOOL_CONFIG.MAX_TOOLS_LONG_CONVERSATION);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ToolManagement] Long conversation tool reduction: ${toolEntries.length} → ${essentialTools.length}`);
    }
    
    appLogger.aiSdk.info(`Reduced tools for long conversation`, {
      correlationId: getCurrentCorrelationId(),
      messageCount,
      originalToolCount: toolEntries.length,
      selectedToolCount: essentialTools.length
    });
    
    return Object.fromEntries(essentialTools) as ToolSet;
  }
}

// =============================================================================
// TOOL DEFINITION OPTIMIZATION
// =============================================================================

/**
 * Truncate tool definitions to prevent context window overflow
 */
export function optimizeToolDefinitions(tools: ToolSet, correlationId: string): ToolSet {
  if (!tools || Object.keys(tools).length === 0) {
    return tools;
  }

  const optimizedTools = { ...tools };

  for (const toolName in optimizedTools) {
    const tool = optimizedTools[toolName];
    const toolRepresentation = JSON.stringify({ 
      name: toolName,
      description: tool.description || '', 
      parameters: tool.parameters 
    });

    // Use a temporary object for token counting
    const currentToolTokens = countTokensForString(toolRepresentation);

    if (currentToolTokens <= TOKEN_CONFIG.MAX_TOKENS_PER_TOOL_DEFINITION) {
      continue; // Tool is already within limits
    }

    const tokensToShed = currentToolTokens - TOKEN_CONFIG.MAX_TOKENS_PER_TOOL_DEFINITION;
    
    // Try to truncate main description first
    if (tool.description && typeof tool.description === 'string') {
      const descriptionTokens = countTokensForString(tool.description);
      
      if (descriptionTokens > tokensToShed + 5) {
        tool.description = truncateStringByTokens(tool.description, descriptionTokens - tokensToShed - 5) + " [...]";
        appLogger.info(`[ToolManagement] Truncated main description for tool '${toolName}'.`, { correlationId });
        continue; // Check if this was enough
      }
    }

    // If main description wasn't enough, try parameter descriptions
    const toolAfterMainTruncation = JSON.stringify({ name: toolName, description: tool.description || '', parameters: tool.parameters });
    const tokensAfterMainTruncation = countTokensForString(toolAfterMainTruncation);

    if (tokensAfterMainTruncation > TOKEN_CONFIG.MAX_TOKENS_PER_TOOL_DEFINITION && tool.parameters && tool.parameters.properties) {
      truncateParameterDescriptions(tool, toolName, tokensAfterMainTruncation - TOKEN_CONFIG.MAX_TOKENS_PER_TOOL_DEFINITION, correlationId);
    }

    // Final check and warning if still over limit
    const finalToolRepresentation = JSON.stringify({ name: toolName, description: tool.description || '', parameters: tool.parameters });
    const finalTokenCount = countTokensForString(finalToolRepresentation);
    
    if (finalTokenCount > TOKEN_CONFIG.MAX_TOKENS_PER_TOOL_DEFINITION) {
      appLogger.warn(`[ToolManagement] Tool '${toolName}' definition (tokens: ${finalTokenCount}) still exceeds limit (${TOKEN_CONFIG.MAX_TOKENS_PER_TOOL_DEFINITION}) after optimization.`, { correlationId });
    }
  }

  return optimizedTools;
}

/**
 * Truncate parameter descriptions for a tool
 */
function truncateParameterDescriptions(tool: { parameters?: { properties?: Record<string, unknown> } }, toolName: string, tokensToShed: number, correlationId: string): void {
  if (!tool.parameters?.properties) return;

  for (const paramName in tool.parameters.properties) {
    const param = tool.parameters.properties[paramName];
    
    if (param && typeof param === 'object' && 'description' in param && typeof param.description === 'string' && param.description.length > 0) {
      const paramDescriptionTokens = countTokensForString(param.description);
      
      if (paramDescriptionTokens > tokensToShed + 5) {
        // Can shed enough from this parameter's description
        const targetTokens = paramDescriptionTokens - tokensToShed - 5;
        param.description = truncateStringByTokens(param.description, targetTokens) + " [...]";
        appLogger.info(`[ToolManagement] Truncated param '${paramName}' description for tool '${toolName}'.`, { correlationId });
        break; // Done shedding tokens
      } else if (paramDescriptionTokens > 5) {
        // Partially truncate to help
        const targetTokens = Math.floor(paramDescriptionTokens / 2) - 5;
        param.description = truncateStringByTokens(param.description, targetTokens) + " [...]";
        appLogger.info(`[ToolManagement] Partially truncated param '${paramName}' description for tool '${toolName}'.`, { correlationId });
        // Continue to other params if still over limit
      }
    }
  }
}