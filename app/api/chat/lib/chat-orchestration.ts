import { Message as MessageAISDK, ToolSet } from 'ai';
import { loadAgent } from "@/lib/agents/load-agent";
import { toolCollectionManager } from "@/lib/mcp/modules/tool-collection-manager";
import { trackSpecialAgentUsage } from "../api";
import { appLogger } from '@/lib/logger';
import { getCurrentCorrelationId } from '@/lib/logger/correlation';

import { processToolMentions, processUrlMentions, processPromptMentions, processFileMentions } from './message-processing';
import { pruneMessagesForPayloadSize } from './message-pruning';
import { TOKEN_CONFIG, truncateToolDefinitions, estimateToolDefinitionTokens, calculateTokenBudget } from './token-management';
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
  model: string;
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

async function configureTools(agentConfig: Record<string, unknown> | null): Promise<ToolSet | undefined> {
  const allTools = await toolCollectionManager.getCombinedMCPToolsForAISDK();

  if (agentConfig?.tools) {
    await trackSpecialAgentUsage();
    return agentConfig.tools as unknown as ToolSet;
  }

  if (agentConfig?.mcpConfig) {
    const mcpConfig = agentConfig.mcpConfig as { server?: string | string[] };
    if (mcpConfig.server) {
      const serverKeys = Array.isArray(mcpConfig.server) ? mcpConfig.server : [mcpConfig.server];
      const filteredTools: ToolSet = {};
      for (const key of Object.keys(allTools)) {
        if (serverKeys.some(serverKey => key.startsWith(`${serverKey}_`))) {
          filteredTools[key] = allTools[key];
        }
      }
      appLogger.aiSdk.info(`Filtered MCP tools for agent.`, {
          correlationId: getCurrentCorrelationId(),
          toolCount: Object.keys(filteredTools).length,
          servers: serverKeys.join(', ')
      });
      return Object.keys(filteredTools).length > 0 ? filteredTools : undefined;
    }
  }

  if (Object.keys(allTools).length > 0) {
    return allTools;
  }

  return undefined;
}

// =============================================================================
// MAIN ORCHESTRATION
// =============================================================================

export async function orchestrateChatProcessing(
  request: ChatRequest
): Promise<ProcessedChatData> {
  const { messages, agentId, systemPrompt, model } = request;
  const correlationId = getCurrentCorrelationId();

  try {
    // 1. Load Agent Configuration
    const agentConfig = await loadAgentConfiguration(agentId);

    // 2. Determine Effective Model and System Prompt
    const effectiveModel = model || (agentConfig?.model as string) || TOKEN_CONFIG.defaultModel;
    const effectiveSystemPrompt = systemPrompt || (agentConfig?.systemPrompt as string) || '';

    // 3. Configure Tools
    let availableTools = await configureTools(agentConfig);

    // 4. Process messages for special mentions (@tools, @urls, etc.)
    const processedMessages = await processUrlMentions(
      await processToolMentions(
        await processPromptMentions(
          await processFileMentions(messages)
        )
      )
    );

    // 5. Select relevant tools based on message content
    if (availableTools && Object.keys(availableTools).length > 0) {
      availableTools = selectRelevantTools(processedMessages, availableTools);
    }

    // 6. Estimate tool definition tokens
    const toolDefinitionTokens = availableTools ? estimateToolDefinitionTokens(availableTools) : 0;
    
    appLogger.aiSdk.debug(`Estimated tool definition tokens.`, {
        correlationId,
        toolDefinitionTokens,
    });

    // 7. Calculate token budget
    const tokenBudget = calculateTokenBudget(toolDefinitionTokens, effectiveModel);

    appLogger.aiSdk.debug(`Token budget calculated.`, {
        correlationId,
        toolDefinitionTokens,
        modelLimit: tokenBudget.modelLimit,
        messageLimit: tokenBudget.messageLimit,
        responseReservation: tokenBudget.responseReservation,
        toolTokens: tokenBudget.toolTokens,
    });

    // 8. Optimize and truncate tool definitions
    let finalTools: ToolSet | undefined = availableTools;
    if (finalTools) {
      const optimizedTools = optimizeToolDefinitions(finalTools);
      finalTools = truncateToolDefinitions(optimizedTools, tokenBudget.toolTokens);
    }

    // 9. Prune messages to fit the token budget
    const finalMessages = pruneMessagesForPayloadSize(
      processedMessages,
      tokenBudget.messageLimit,
      correlationId
    );
    
    appLogger.aiSdk.info(`Chat orchestration complete`, {
        correlationId,
        inboundMessages: processedMessages.length,
        outboundMessages: finalMessages.length,
        toolCount: finalTools ? Object.keys(finalTools).length : 0
    });

    return {
      model: effectiveModel,
      finalMessages,
      effectiveSystemPrompt,
      toolsToUse: finalTools,
      tokenBudget,
    };
  } catch (error) {
    appLogger.aiSdk.error('Error in chat processing pipeline', error as Error, {
        correlationId,
        requestContext: {
            chatId: request.chatId,
            model: request.model,
            agentId: request.agentId,
            messageCount: request.messages.length
        }
    });
    throw error;
  }
}