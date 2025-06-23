# Token Usage Optimization Analysis

## Executive Summary

The Piper chat application has several opportunities to optimize token usage while maintaining output quality. The analysis reveals that **system prompts and tool definitions are the largest token consumers**, with potential savings of 40-60% of current token usage through strategic optimizations.

**UPDATE**: Discovered extensive existing caching infrastructure that can be leveraged for even greater token optimization gains.

## Current Token Usage Breakdown

### 1. System Prompt (Major Consumer)
- **Current Size**: ~2,000+ characters (~500-650 tokens)
- **Usage**: Sent with every chat interaction
- **Impact**: Consumes ~8-13% of default 8192 token context window
- **Issue**: Lists ALL available MCP tools verbosely regardless of relevance

### 2. Tool Definitions (Significant Consumer)
- **Current Limit**: 150 tokens per tool definition
- **Active Tools**: Can load 50+ tools simultaneously
- **Estimated Usage**: 2,000-7,500 tokens (25-90% of context window)
- **Issue**: Loads ALL available tools regardless of conversation context

### 3. Token Configuration Analysis
```typescript
MODEL_CONTEXT_LIMIT: 8192 tokens (conservative)
MAX_TOKENS: 8096 tokens (generation)
RESPONSE_RESERVATION_TOKENS: 1500 tokens
Available for conversation: ~4700 tokens
```

## 🎯 LEVERAGING EXISTING CACHING INFRASTRUCTURE

### Current Caching Architecture Analysis

The codebase already has sophisticated caching infrastructure that's **underutilized for token optimization**:

#### A. **Redis Cache Manager** (`lib/mcp/modules/redis-cache-manager.ts`)
- **Current Use**: Caches server status and tool lists (5-minute TTL)
- **Opportunity**: Cache compressed tool definitions and context-aware tool selections
- **Benefit**: Avoid regenerating tool collections on every request

#### B. **Tool Collection Manager** (`lib/mcp/modules/tool-collection-manager.ts`)
- **Current Use**: Fetches tools from all servers on every request
- **Opportunity**: Cache tool selections based on conversation context
- **Benefit**: Reuse optimal tool sets across similar conversations

#### C. **Managed MCP Client** (`lib/mcp/enhanced/managed-client.ts`)
- **Current Use**: Caches tool definitions in memory
- **Opportunity**: Cache token-optimized versions of tools
- **Benefit**: Reduce tool definition processing overhead

### Enhanced Caching Strategy for Token Optimization

```typescript
// New caching layers for token optimization
interface TokenOptimizedCache {
  // Cache compressed tool definitions
  compressedToolDefinitions: Map<string, CompressedToolDef>;
  
  // Cache context-aware tool selections
  contextualToolSelections: Map<string, ToolSet>; // key = context hash
  
  // Cache dynamic system prompts
  contextualSystemPrompts: Map<string, string>; // key = context hash
  
  // Cache conversation context analysis
  conversationContexts: Map<string, ConversationContext>;
}
```

## High-Impact Optimizations (Enhanced with Caching)

### A. **Cached Context-Aware Tool Selection** 🎯 **MASSIVE IMPACT**

**Current Problem**: `getCombinedMCPToolsForAISDK()` loads ALL tools on every request
**Enhanced Solution**: Multi-layer caching with intelligent invalidation

```typescript
// Enhanced tool collection manager with caching
export class EnhancedToolCollectionManager {
  private contextCache = new Map<string, ToolSet>();
  private toolDefinitionCache = new Map<string, CompressedToolDef>();
  private lastCacheRefresh = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getCombinedMCPToolsForAISDK(
    conversationContext?: ConversationContext
  ): Promise<ToolSet> {
    // 1. Generate context hash for caching
    const contextHash = this.generateContextHash(conversationContext);
    
    // 2. Check Redis cache first
    const cachedTools = await redisCacheManager.getToolSelection(contextHash);
    if (cachedTools) {
      return cachedTools; // ✅ Cache hit - zero tool loading overhead
    }
    
    // 3. Check if we need to refresh tool definitions
    if (this.shouldRefreshCache()) {
      await this.refreshToolDefinitionCache();
    }
    
    // 4. Generate context-aware tool selection
    const selectedTools = await this.selectToolsForContext(conversationContext);
    
    // 5. Cache the selection
    await redisCacheManager.setToolSelection(contextHash, selectedTools, 300); // 5 min TTL
    
    return selectedTools;
  }
  
  private generateContextHash(context?: ConversationContext): string {
    if (!context) return 'default';
    
    // Hash recent messages, tool mentions, conversation length
    const hashInput = {
      recentMessages: context.recentMessages?.slice(-3).map(m => m.content),
      toolMentions: context.mentionedTools,
      conversationLength: context.messageCount,
      timestamp: Math.floor(Date.now() / (1000 * 60 * 5)) // 5-min buckets
    };
    
    return createHash('md5').update(JSON.stringify(hashInput)).digest('hex');
  }
}
```

**Estimated Savings**: 
- **First request**: 1,000-5,000 tokens (intelligent selection)
- **Cached requests**: ~7,500 tokens (avoid loading 50+ tools entirely)
- **Cache hit rate**: Expected 60-80% for similar conversations

### B. **Redis-Cached System Prompts** 🎯 **HIGH IMPACT**

```typescript
// Enhanced Redis cache for system prompts
interface SystemPromptCache {
  key: string; // context hash
  prompt: string; // optimized prompt
  toolCategories: string[]; // relevant tool categories
  tokenCount: number; // for monitoring
  createdAt: number;
}

class SystemPromptCacheManager {
  private static readonly CACHE_PREFIX = 'system_prompt:';
  private static readonly TTL = 10 * 60; // 10 minutes
  
  async getCachedSystemPrompt(
    toolCategories: string[],
    conversationContext: string
  ): Promise<string | null> {
    const cacheKey = this.generatePromptCacheKey(toolCategories, conversationContext);
    const cached = await redisCacheManager.getClient()?.get(
      `${SystemPromptCacheManager.CACHE_PREFIX}${cacheKey}`
    );
    
    if (cached) {
      const data: SystemPromptCache = JSON.parse(cached);
      return data.prompt; // ✅ 300-500 token savings
    }
    
    return null;
  }
  
  async setCachedSystemPrompt(
    toolCategories: string[],
    conversationContext: string,
    prompt: string
  ): Promise<void> {
    const cacheKey = this.generatePromptCacheKey(toolCategories, conversationContext);
    const data: SystemPromptCache = {
      key: cacheKey,
      prompt,
      toolCategories,
      tokenCount: this.estimateTokens(prompt),
      createdAt: Date.now()
    };
    
    await redisCacheManager.getClient()?.setex(
      `${SystemPromptCacheManager.CACHE_PREFIX}${cacheKey}`,
      SystemPromptCacheManager.TTL,
      JSON.stringify(data)
    );
  }
}
```

### C. **Tool Definition Compression Cache** 🎯 **MEDIUM IMPACT**

```typescript
// Extend existing Redis cache for compressed tool definitions
interface CompressedToolDefinition {
  name: string;
  shortDescription: string; // 10-20 words max
  essentialParams: Record<string, string>; // type info only
  fullDefinition?: ToolDefinition; // for fallback
  tokensSaved: number;
}

class ToolDefinitionCompressionCache {
  private static readonly COMPRESSION_CACHE_PREFIX = 'compressed_tool:';
  
  async getCompressedTool(toolId: string): Promise<CompressedToolDefinition | null> {
    // Check Redis first
    const cached = await redisCacheManager.getClient()?.get(
      `${ToolDefinitionCompressionCache.COMPRESSION_CACHE_PREFIX}${toolId}`
    );
    
    if (cached) {
      return JSON.parse(cached); // ✅ 50-100 tokens saved per tool
    }
    
    return null;
  }
  
  async compressAndCacheTool(toolId: string, fullTool: ToolDefinition): Promise<CompressedToolDefinition> {
    const compressed: CompressedToolDefinition = {
      name: fullTool.name,
      shortDescription: this.compressDescription(fullTool.description),
      essentialParams: this.extractEssentialParams(fullTool.parameters),
      tokensSaved: this.calculateTokenSavings(fullTool),
    };
    
    // Cache for 1 hour
    await redisCacheManager.getClient()?.setex(
      `${ToolDefinitionCompressionCache.COMPRESSION_CACHE_PREFIX}${toolId}`,
      3600,
      JSON.stringify(compressed)
    );
    
    return compressed;
  }
}
```

## Quick Implementation (Leveraging Existing Cache)

### 1. **Immediate Redis Cache Enhancement** (30 minutes)

```typescript
// Add to redis-cache-manager.ts
export class RedisCacheManager {
  // ... existing code ...
  
  // New methods for token optimization
  async getToolSelection(contextHash: string): Promise<ToolSet | null> {
    const data = await this.getClient()?.get(`tool_selection:${contextHash}`);
    return data ? JSON.parse(data) : null;
  }
  
  async setToolSelection(contextHash: string, tools: ToolSet, ttl: number): Promise<void> {
    await this.getClient()?.setex(
      `tool_selection:${contextHash}`,
      ttl,
      JSON.stringify(tools)
    );
  }
  
  async getSystemPrompt(contextHash: string): Promise<string | null> {
    return await this.getClient()?.get(`system_prompt:${contextHash}`);
  }
  
  async setSystemPrompt(contextHash: string, prompt: string, ttl: number): Promise<void> {
    await this.getClient()?.setex(`system_prompt:${contextHash}`, ttl, prompt);
  }
}
```

### 2. **Enhanced Tool Collection with Context Caching** (1 hour)

```typescript
// Modify tool-collection-manager.ts
export class ToolCollectionManager {
  private contextCache = new LRUCache<string, ToolSet>({ max: 100, ttl: 5 * 60 * 1000 });
  
  async getCombinedMCPToolsForAISDK(messageHistory?: MessageAISDK[]): Promise<ToolSet> {
    // Generate context signature
    const contextSig = this.generateContextSignature(messageHistory);
    
    // Check memory cache first (fastest)
    let cachedTools = this.contextCache.get(contextSig);
    if (cachedTools) return cachedTools;
    
    // Check Redis cache (fast)
    cachedTools = await redisCacheManager.getToolSelection(contextSig);
    if (cachedTools) {
      this.contextCache.set(contextSig, cachedTools);
      return cachedTools;
    }
    
    // Generate new selection (slow path)
    const selectedTools = await this.generateContextualToolSelection(messageHistory);
    
    // Cache at both levels
    this.contextCache.set(contextSig, selectedTools);
    await redisCacheManager.setToolSelection(contextSig, selectedTools, 300);
    
    return selectedTools;
  }
}
```

## Expected Performance Gains with Caching

| Scenario | Current Tokens | With Caching | Savings | Response Time |
|----------|----------------|--------------|---------|---------------|
| Fresh conversation | 7,500 | 2,000 | 73% | Same |
| Similar context (cache hit) | 7,500 | 500 | 93% | 80% faster |
| Repeated tool patterns | 7,500 | 1,000 | 87% | 60% faster |

### Cache Performance Metrics

```typescript
// Add to existing metrics collection
interface TokenOptimizationMetrics {
  cacheHitRate: number;
  tokensSavedPerRequest: number;
  averageToolSelectionTime: number;
  systemPromptCacheEfficiency: number;
  toolDefinitionCompressionRatio: number;
}
```

## Optimization Opportunities (High Impact)

### A. Dynamic System Prompt Optimization 🎯 **HIGH IMPACT**

**Current Problem**: Static, verbose system prompt listing all capabilities
**Solution**: Context-aware, dynamic system prompts

```typescript
// Current (verbose)
SYSTEM_PROMPT_DEFAULT = `You are Piper... [2000+ chars listing all tools]`

// Optimized (contextual)
const generateDynamicSystemPrompt = (availableTools: string[], messageContext: string) => {
  const relevantCapabilities = identifyRelevantCapabilities(availableTools, messageContext);
  return `You are Piper, a thoughtful assistant. ${relevantCapabilities.join(', ')}.`;
}
```

**Estimated Savings**: 300-500 tokens per request (30-50% reduction in system prompt size)

### B. Intelligent Tool Selection 🎯 **HIGH IMPACT**

**Current Problem**: Loads all available tools regardless of conversation context
**Solution**: Context-aware tool loading with caching

```typescript
// Enhanced tool selection strategy
export function selectRelevantToolsEnhanced(
  allTools: ToolSet, 
  messageHistory: MessageAISDK[],
  messageCount: number
): ToolSet {
  // Analyze recent messages for tool hints
  const toolHints = extractToolHints(messageHistory);
  
  if (messageCount <= 5) {
    // Short conversations: Load core tools + mentioned tools
    return loadCoreAndMentionedTools(allTools, toolHints);
  } else if (messageCount <= 15) {
    // Medium conversations: Add conversation-relevant tools
    return loadContextualTools(allTools, toolHints, messageHistory);
  } else {
    // Long conversations: Minimal essential tools only
    return loadEssentialTools(allTools);
  }
}
```

**Estimated Savings**: 1,000-5,000 tokens per request (50-80% reduction in tool definitions)

### C. Tool Definition Compression 🎯 **MEDIUM IMPACT**

**Current Problem**: Verbose tool descriptions consuming excessive tokens
**Solution**: Compressed, essential-only tool definitions

```typescript
// Current tool definition
{
  name: "plex_search_library",
  description: "Search for media items in a specific Plex library. This tool allows you to find movies, TV shows, music, or other media by title, genre, or other metadata within a specified library on your Plex server.",
  parameters: { /* detailed schema */ }
}

// Optimized tool definition
{
  name: "plex_search_library", 
  description: "Search Plex library by title/genre",
  parameters: { query: "string", library: "string" } // Essential params only
}
```

**Estimated Savings**: 50-100 tokens per tool (30-60% reduction per tool definition)

## Optimization Opportunities (Medium Impact)

### D. Message Processing Optimization

**File Mentions**: Already optimized (converts to attachments)
**URL Mentions**: Could implement intelligent content extraction
**Prompt Mentions**: Could cache processed prompts

### E. Context Window Management

**Current**: Fixed 8192 token limit
**Opportunity**: Dynamic context window based on model capabilities
```typescript
const getModelContextWindow = (model: string): number => {
  const modelData = getModelData(model);
  return modelData?.contextWindow || 8192;
}
```

### F. Enhanced Message Pruning

**Current**: Simple LIFO pruning
**Opportunity**: Semantic importance-based pruning
- Preserve messages with tool calls
- Keep messages with high user engagement
- Summarize middle conversation segments

## Implementation Strategy

### Phase 1: Cache-Enhanced Tool Selection (Week 1)
1. ✅ **Leverage existing Redis cache** for tool selections
2. Add context-aware caching keys
3. Implement LRU memory cache for frequent patterns

### Phase 2: System Prompt Optimization (Week 1) 
1. Create dynamic system prompt generator
2. **Cache generated prompts in Redis**
3. A/B test with current system prompt

### Phase 3: Tool Definition Compression (Week 2)
1. **Use existing cache for compressed definitions**
2. Implement on-demand detailed descriptions
3. Add tool definition caching

### Phase 4: Advanced Optimizations (Week 3)
1. Dynamic context window management
2. Enhanced message pruning strategies
3. Performance monitoring and tuning

## Expected Results (Enhanced with Caching)

| Optimization | Token Savings | Cache Benefit | Implementation Effort | Quality Impact |
|-------------|---------------|---------------|----------------------|----------------|
| Cached Tool Selection | 1000-5000 tokens | 60-80% cache hits | Low (reuse existing) | Minimal |
| Cached System Prompts | 300-500 tokens | 70-85% cache hits | Low (reuse existing) | Minimal |
| Tool Definition Compression | 50-100 per tool | 90%+ cache hits | Low | Low |
| Context Window Management | 10-30% efficiency | N/A | Medium | Positive |

**Total Expected Savings**: **60-80% reduction** in token usage per request (enhanced from 40-60% without caching)

**Cache Performance**: Expected 60-80% cache hit rate for tool selections, 70-85% for system prompts

## Code Implementation Examples

### Dynamic System Prompt
```typescript
// lib/config.ts - Enhanced system prompt
export const generateContextualSystemPrompt = (
  availableToolCategories: string[],
  conversationContext?: string
): string => {
  const basePrompt = "You are Piper, a thoughtful and clear assistant.";
  
  if (availableToolCategories.length === 0) {
    return basePrompt;
  }
  
  const toolSummary = availableToolCategories.length <= 3 
    ? `You have access to ${availableToolCategories.join(', ')} capabilities.`
    : `You have access to various tools including ${availableToolCategories.slice(0, 3).join(', ')} and others.`;
    
  return `${basePrompt} ${toolSummary}`;
};
```

### Intelligent Tool Selection
```typescript
// app/api/chat/lib/tool-management.ts - Enhanced selection
export function selectToolsIntelligently(
  allTools: ToolSet, 
  messageHistory: MessageAISDK[],
  maxTokenBudget: number
): ToolSet {
  const recentMessages = messageHistory.slice(-3);
  const mentionedTools = extractMentionedTools(recentMessages);
  const contextKeywords = extractKeywords(recentMessages);
  
  const selectedTools: ToolSet = {};
  let currentTokenUsage = 0;
  
  // Priority 1: Explicitly mentioned tools
  for (const toolName of mentionedTools) {
    if (allTools[toolName] && currentTokenUsage < maxTokenBudget) {
      selectedTools[toolName] = allTools[toolName];
      currentTokenUsage += estimateToolTokens(allTools[toolName]);
    }
  }
  
  // Priority 2: Context-relevant tools
  const relevantTools = findToolsByKeywords(allTools, contextKeywords);
  for (const [toolName, tool] of relevantTools) {
    if (!selectedTools[toolName] && currentTokenUsage < maxTokenBudget) {
      selectedTools[toolName] = tool;
      currentTokenUsage += estimateToolTokens(tool);
    }
  }
  
  // Priority 3: Core tools if budget allows
  const coreTools = getCoreTools(allTools);
  for (const [toolName, tool] of coreTools) {
    if (!selectedTools[toolName] && currentTokenUsage < maxTokenBudget) {
      selectedTools[toolName] = tool;
      currentTokenUsage += estimateToolTokens(tool);
    }
  }
  
  return selectedTools;
}
```

## Monitoring and Metrics

Implement tracking for:
- Token usage per request (before/after)
- **Cache hit rates by optimization type**
- Tool selection accuracy (relevant tools chosen)
- Response quality metrics
- User satisfaction scores
- Performance impact measurements
- **Cache memory usage and Redis performance**

## Risk Mitigation

1. **Quality Assurance**: A/B testing between optimized and current approaches
2. **Fallback Mechanisms**: Ability to revert to full tool loading if needed
3. **Progressive Rollout**: Implement optimizations incrementally
4. **User Feedback**: Monitor for any degradation in assistant capabilities
5. **Cache Invalidation**: Proper cache invalidation strategies to avoid stale data
6. **Cache Monitoring**: Redis monitoring and memory usage alerts

## Conclusion

**With existing caching infrastructure**, these optimizations can reduce token usage by **60-80%** while maintaining output quality. The highest impact comes from cached tool selections and system prompts, which together can save 1,300-5,500 tokens per request with 60-80% cache hit rates. This translates to longer conversation histories, faster response times, reduced API costs, and **significantly improved response performance** due to cache hits.