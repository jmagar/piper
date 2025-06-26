import { createHash } from 'crypto';
import { Message as MessageAISDK } from 'ai';
import { appLogger } from '@/lib/logger';
import { getCurrentCorrelationId } from '@/lib/logger/correlation';
import { redisCacheManager } from './redis-cache-manager';

// =============================================================================
// TYPES
// =============================================================================

export interface ConversationContext {
  messageCount: number;
  recentMessages: MessageAISDK[];
  toolMentions: string[];
  hasFiles: boolean;
  hasUrls: boolean;
  hasPrompts: boolean;
  conversationType: 'new' | 'short' | 'medium' | 'long';
}

export interface ToolCategory {
  name: string;
  description: string;
  tools: string[];
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const SYSTEM_PROMPT_CONFIG = {
  // TTL for cached system prompts (10 minutes)
  CACHE_TTL: 10 * 60,
  
  // Conversation length thresholds
  SHORT_CONVERSATION_THRESHOLD: 5,
  MEDIUM_CONVERSATION_THRESHOLD: 15,
  
  // Base system prompt
  BASE_PROMPT: "You are Piper, a thoughtful and clear assistant.",
  
  // Tool categories for context-aware selection
  CORE_TOOLS: ['search', 'file', 'web', 'basic'],
  DEVELOPMENT_TOOLS: ['code', 'git', 'terminal', 'mcp'],
  MEDIA_TOOLS: ['plex', 'media', 'entertainment'],
  SYSTEM_TOOLS: ['unraid', 'system', 'admin'],
} as const;

// =============================================================================
// CONTEXT ANALYSIS
// =============================================================================

/**
 * Analyze conversation to determine context for system prompt optimization
 */
export function analyzeConversationContext(messages: MessageAISDK[]): ConversationContext {
  const messageCount = messages.length;
  const recentMessages = messages.slice(-3); // Last 3 messages for context
  
  // Extract mentions from recent messages
  const toolMentions: string[] = [];
  let hasFiles = false;
  let hasUrls = false;
  let hasPrompts = false;
  
  for (const message of recentMessages) {
    if (message.role === 'user' && typeof message.content === 'string') {
      // Basic pattern matching for tool mentions
      const toolMatches = message.content.match(/@([a-zA-Z_][a-zA-Z0-9_]*)/g) || [];
      toolMentions.push(...toolMatches.map(m => m.substring(1)));
      
      // Check for file mentions
      if (message.content.includes('/') || message.content.includes('.txt') || message.content.includes('.json')) {
        hasFiles = true;
      }
      
      // Check for URL mentions
      if (message.content.includes('http') || message.content.includes('www.')) {
        hasUrls = true;
      }
      
      // Check for prompt mentions
      if (message.content.includes('prompt') || message.content.includes('system')) {
        hasPrompts = true;
      }
    }
  }
  
  // Determine conversation type
  let conversationType: ConversationContext['conversationType'] = 'new';
  if (messageCount <= SYSTEM_PROMPT_CONFIG.SHORT_CONVERSATION_THRESHOLD) {
    conversationType = 'short';
  } else if (messageCount <= SYSTEM_PROMPT_CONFIG.MEDIUM_CONVERSATION_THRESHOLD) {
    conversationType = 'medium';
  } else {
    conversationType = 'long';
  }
  
  return {
    messageCount,
    recentMessages,
    toolMentions: Array.from(new Set(toolMentions)), // Remove duplicates
    hasFiles,
    hasUrls,
    hasPrompts,
    conversationType
  };
}

// =============================================================================
// TOOL CATEGORIZATION
// =============================================================================

/**
 * Categorize available tools based on their names and functionality
 */
export function categorizeTools(availableTools: string[]): ToolCategory[] {
  const categories: ToolCategory[] = [];
  
  // Core tools (always mention)
  const coreTools = availableTools.filter(tool => 
    SYSTEM_PROMPT_CONFIG.CORE_TOOLS.some(core => tool.toLowerCase().includes(core))
  );
  if (coreTools.length > 0) {
    categories.push({
      name: 'core',
      description: 'file operations, web search, and basic utilities',
      tools: coreTools
    });
  }
  
  // Development tools
  const devTools = availableTools.filter(tool => 
    SYSTEM_PROMPT_CONFIG.DEVELOPMENT_TOOLS.some(dev => tool.toLowerCase().includes(dev))
  );
  if (devTools.length > 0) {
    categories.push({
      name: 'development',
      description: 'code analysis, repository management, and MCP tools',
      tools: devTools
    });
  }
  
  // Media tools
  const mediaTools = availableTools.filter(tool => 
    SYSTEM_PROMPT_CONFIG.MEDIA_TOOLS.some(media => tool.toLowerCase().includes(media))
  );
  if (mediaTools.length > 0) {
    categories.push({
      name: 'media',
      description: 'media server management and entertainment',
      tools: mediaTools
    });
  }
  
  // System tools
  const systemTools = availableTools.filter(tool => 
    SYSTEM_PROMPT_CONFIG.SYSTEM_TOOLS.some(sys => tool.toLowerCase().includes(sys))
  );
  if (systemTools.length > 0) {
    categories.push({
      name: 'system',
      description: 'system administration and server management',
      tools: systemTools
    });
  }
  
  return categories;
}

// =============================================================================
// CONTEXT HASH GENERATION
// =============================================================================

/**
 * Generate a hash for caching system prompts based on context
 */
export function generateSystemPromptContextHash(
  context: ConversationContext,
  toolCategories: ToolCategory[]
): string {
  const hashInput = {
    conversationType: context.conversationType,
    toolMentions: context.toolMentions.sort(), // Sort for consistency
    hasFiles: context.hasFiles,
    hasUrls: context.hasUrls,
    hasPrompts: context.hasPrompts,
    toolCategoryNames: toolCategories.map(c => c.name).sort(),
    // Use time buckets for cache invalidation (every 30 minutes)
    timeBucket: Math.floor(Date.now() / (30 * 60 * 1000))
  };
  
  return createHash('md5').update(JSON.stringify(hashInput)).digest('hex');
}

// =============================================================================
// SYSTEM PROMPT GENERATION
// =============================================================================

/**
 * Generate an optimized, context-aware system prompt
 */
export function generateOptimizedSystemPrompt(
  context: ConversationContext,
  toolCategories: ToolCategory[]
): string {
  let prompt = SYSTEM_PROMPT_CONFIG.BASE_PROMPT;
  
  // Add context-specific capabilities based on conversation
  const capabilities: string[] = [];
  
  // Always mention core capabilities if available
  const coreCategory = toolCategories.find(c => c.name === 'core');
  if (coreCategory) {
    capabilities.push(coreCategory.description);
  }
  
  // Add context-specific capabilities
  if (context.hasFiles || context.toolMentions.some(t => t.includes('file'))) {
    capabilities.push('file analysis and processing');
  }
  
  if (context.hasUrls || context.toolMentions.some(t => t.includes('web'))) {
    capabilities.push('web content retrieval');
  }
  
  // Add tool category descriptions based on conversation type
  if (context.conversationType === 'short' || context.conversationType === 'new') {
    // For short conversations, mention relevant categories only
    const relevantCategories = toolCategories.filter(cat => 
      context.toolMentions.some(mention => 
        cat.tools.some(tool => tool.toLowerCase().includes(mention.toLowerCase()))
      )
    );
    
    for (const category of relevantCategories.slice(0, 2)) { // Limit to 2 categories
      capabilities.push(category.description);
    }
  } else if (context.conversationType === 'medium') {
    // For medium conversations, mention 2-3 categories
    for (const category of toolCategories.slice(0, 3)) {
      capabilities.push(category.description);
    }
  } else {
    // For long conversations, be minimal - just mention available tools
    capabilities.push('various specialized tools');
  }
  
  // Construct the final prompt
  if (capabilities.length > 0) {
    const capabilityText = capabilities.length === 1 
      ? capabilities[0]
      : capabilities.slice(0, -1).join(', ') + ', and ' + capabilities[capabilities.length - 1];
    
    prompt += ` I have access to ${capabilityText}.`;
  }
  
  // Add conversation-specific guidance
  if (context.conversationType === 'long') {
    prompt += ' I focus on essential tools to maintain conversation efficiency.';
  }
  
  return prompt;
}

// =============================================================================
// MAIN OPTIMIZATION FUNCTION
// =============================================================================

/**
 * Get optimized system prompt with caching
 */
export async function getOptimizedSystemPrompt(
  messages: MessageAISDK[],
  availableTools: string[] = [],
  fallbackPrompt?: string
): Promise<string> {
  try {
    // Analyze conversation context
    const context = analyzeConversationContext(messages);
    
    // Categorize available tools
    const toolCategories = categorizeTools(availableTools);
    
    // Generate cache key
    const contextHash = generateSystemPromptContextHash(context, toolCategories);
    
    // Try cache first
    const cachedPrompt = await redisCacheManager.getSystemPrompt(contextHash);
    if (cachedPrompt) {
      appLogger.debug(`[System Prompt Optimizer] Cache HIT - using cached prompt`, {
        correlationId: getCurrentCorrelationId(),
        operationId: 'system_prompt_cache_hit'
      });
      return cachedPrompt;
    }
    
    // Generate optimized prompt
    const optimizedPrompt = generateOptimizedSystemPrompt(context, toolCategories);
    
    // Cache the result
    await redisCacheManager.setSystemPrompt(contextHash, optimizedPrompt, SYSTEM_PROMPT_CONFIG.CACHE_TTL);
    
    const tokenSavings = estimateTokenSavings(fallbackPrompt || '', optimizedPrompt);
    appLogger.info(
      `[System Prompt Optimizer] Generated optimized system prompt for ${context.conversationType} conversation ` +
      `(${context.messageCount} messages, ${toolCategories.length} tool categories). ` +
      `Estimated token savings: ${tokenSavings} tokens`,
      {
        correlationId: getCurrentCorrelationId(),
        operationId: 'system_prompt_generated',
        args: {
          conversationType: context.conversationType,
          messageCount: context.messageCount,
          toolCategoriesCount: toolCategories.length,
          estimatedTokenSavings: tokenSavings
        }
      }
    );
    
    return optimizedPrompt;
    
  } catch (error) {
    appLogger.error(
      `[System Prompt Optimizer] Error generating optimized prompt`,
      {
        correlationId: getCurrentCorrelationId(),
        operationId: 'system_prompt_generation_error',
        error: error as Error
      }
    );
    
    // Fallback to provided prompt or basic prompt
    return fallbackPrompt || SYSTEM_PROMPT_CONFIG.BASE_PROMPT;
  }
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Estimate token savings from optimization
 */
function estimateTokenSavings(originalPrompt: string, optimizedPrompt: string): number {
  // Simple character-based estimation (approximately 3-4 chars per token)
  const originalChars = originalPrompt.length;
  const optimizedChars = optimizedPrompt.length;
  const charSavings = Math.max(0, originalChars - optimizedChars);
  
  return Math.floor(charSavings / 3.5); // Conservative estimate
}

/**
 * Clear system prompt cache (for debugging)
 */
export async function clearSystemPromptCache(): Promise<void> {
  const client = redisCacheManager.getClient();
  if (!client) return;

  try {
    const keys = await client.keys('system_prompt:*');
    if (keys.length > 0) {
      await client.del(...keys);
      appLogger.info(`[System Prompt Optimizer] Cleared ${keys.length} cached system prompts`, {
        correlationId: getCurrentCorrelationId(),
        operationId: 'system_prompt_cache_cleared',
        args: { keysCleared: keys.length }
      });
    }
  } catch (error) {
    appLogger.error(`[System Prompt Optimizer] Error clearing cache`, {
      correlationId: getCurrentCorrelationId(),
      operationId: 'system_prompt_cache_clear_error',
      error: error as Error
    });
  }
} 