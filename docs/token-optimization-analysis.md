# Token Usage Optimization Analysis

## Executive Summary

The Piper chat application has several opportunities to optimize token usage while maintaining output quality. The analysis reveals that **system prompts and tool definitions are the largest token consumers**, with potential savings of 40-60% of current token usage through strategic optimizations.

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

### Phase 1: System Prompt Optimization (Week 1)
1. Create dynamic system prompt generator
2. Implement context-aware capability listing  
3. A/B test with current system prompt

### Phase 2: Tool Selection Enhancement (Week 2)
1. Implement intelligent tool filtering
2. Add conversation context analysis
3. Create tool usage analytics for optimization

### Phase 3: Tool Definition Compression (Week 3)
1. Create compressed tool definition format
2. Implement on-demand detailed descriptions
3. Add tool definition caching

### Phase 4: Advanced Optimizations (Week 4)
1. Dynamic context window management
2. Enhanced message pruning strategies
3. Performance monitoring and tuning

## Expected Results

| Optimization | Token Savings | Implementation Effort | Quality Impact |
|-------------|---------------|----------------------|----------------|
| Dynamic System Prompt | 300-500 tokens | Medium | Minimal |
| Intelligent Tool Selection | 1000-5000 tokens | High | Low |
| Tool Definition Compression | 50-100 per tool | Low | Low |
| Context Window Management | 10-30% efficiency | Medium | Positive |

**Total Expected Savings**: 40-60% reduction in token usage per request

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
- Tool selection accuracy (relevant tools chosen)
- Response quality metrics
- User satisfaction scores
- Performance impact measurements

## Risk Mitigation

1. **Quality Assurance**: A/B testing between optimized and current approaches
2. **Fallback Mechanisms**: Ability to revert to full tool loading if needed
3. **Progressive Rollout**: Implement optimizations incrementally
4. **User Feedback**: Monitor for any degradation in assistant capabilities

## Conclusion

These optimizations can reduce token usage by 40-60% while maintaining output quality. The highest impact comes from dynamic system prompts and intelligent tool selection, which together can save 1,300-5,500 tokens per request. This translates to longer conversation histories, faster response times, and reduced API costs.