# Dead/Stale/Unused Code Analysis Report

## Overview
This report identifies dead, stale, or unused code in the Piper AI codebase based on systematic analysis using knip and targeted searches.

## Summary
- **67 unused files** detected
- **10 unused dependencies** in package.json
- **18 unlisted dependencies** (being used but not declared)
- **270 unused exports** across the codebase
- **163 unused exported types**
- **7 unused exported enum members**
- **Extensive console.log statements** for debugging
- **TODO comments** indicating incomplete features
- **Commented out imports/exports** suggesting dead code

## 1. Unused Files (67 total)

### High Priority - Core Application Files
```
app/api/chat/messageTransformer.ts
app/components/chat/feedback-widget.tsx
app/components/chat/reasoning.tsx
app/components/chat/tool-invocation.tsx
app/components/chat/use-file-upload.ts
app/sw.ts
```

### Medium Priority - UI Components
```
app/components/agents/research-section.tsx
app/components/chat-input/agent-command.tsx
app/components/chat-input/agents.tsx
app/components/chat-input/button-file-upload.tsx
app/components/chat-input/file-items.tsx
app/components/chat-input/file-list.tsx
app/components/chat-input/prompt-command.tsx
app/components/chat-input/selected-url-display.tsx
app/components/chat-input/suggestions.tsx
app/components/chat-input/tool-command.tsx
app/components/header-go-back.tsx
app/components/layout/agent-link.tsx
app/components/layout/app-info/app-info-content.tsx
app/components/layout/app-info/app-info-trigger.tsx
app/components/layout/feedback/feedback-trigger.tsx
app/components/layout/header-agent.tsx
app/components/layout/prompt-link.tsx
app/components/layout/settings/connections-section.tsx
app/components/layout/theme-toggle.tsx
app/components/mcp-dashboard/log-viewer-placeholder.tsx
app/components/mcp-dashboard/monitoring-placeholder.tsx
app/components/suggestions/prompt-system.tsx
```

### Low Priority - Supporting Files
```
app/p/[chatId]/article.tsx
app/p/[chatId]/header.tsx
app/types/user.ts
components/common/feedback-form.tsx
components/icons/anthropic.tsx
components/icons/claude.tsx
components/icons/deepseek.tsx
components/icons/gemini.tsx
components/icons/google.tsx
components/icons/grok.tsx
components/icons/mistral.tsx
components/icons/openai.tsx
components/icons/openrouter.tsx
components/icons/xai.tsx
components/layout/app-shell.tsx
components/motion-primitives/morphing-popover.tsx
components/motion-primitives/progressive-blur.tsx
components/prompt-kit/prompt-suggestion.tsx
components/prompt-kit/reasoning.tsx
components/prompt-kit/response-stream.tsx
components/ui/skeleton-screens.tsx
```

### Library and Utility Files
```
lib/api-admin.ts
lib/file-handling.ts
lib/hooks/useOfflineChat.ts
lib/logger/base.ts
lib/logger/rotation-config.ts
lib/logger/security.ts
lib/models/data/gemini.ts
lib/models/data/llama.ts
lib/motion.ts
lib/offline-storage.ts
lib/openproviders/env.ts
lib/providers/index.ts
lib/pwa/performance.ts
lib/server/api.ts
lib/sync/background-sync.ts
lib/usage.ts
prisma/seed.ts
public/sw.js
```

## 2. Unused Dependencies (10 total)

### Production Dependencies to Remove
```json
{
  "@antv/mcp-server-chart": "^0.4.0",
  "@modelcontextprotocol/sdk": "^1.12.1",
  "@modelcontextprotocol/server-sequential-thinking": "^0.6.2",
  "@serwist/next": "^9.0.14",
  "@serwist/sw": "^9.0.14",
  "@types/express": "^5.0.2",
  "exa-js": "^1.6.13",
  "idb": "^8.0.3",
  "prisma": "^6.8.2",
  "tailwindcss-animate": "^1.0.7"
}
```

## 3. Unlisted Dependencies (18 total)

### Missing Dependencies to Add
```json
{
  "@ai-sdk/ui-utils": "Missing in package.json",
  "json-schema": "Missing in package.json",
  "nanoid": "Missing in package.json",
  "framer-motion": "Missing in package.json",
  "@ai-sdk/react": "Missing in package.json",
  "@ai-sdk/provider": "Missing in package.json",
  "logform": "Missing in package.json"
}
```

## 4. High-Impact Unused Exports (Selected)

### API Functions
```typescript
// app/api/chat/api.ts
- storeAssistantMessage
- trackSpecialAgentUsage

// app/api/chat/lib/message-pruning.ts
- pruneMessagesForPayloadSize

// app/api/chat/lib/token-management.ts
- getTokenCountingMetrics
- resetTokenCountingMetrics
- countTokensForStringCached
- estimateToolDefinitionTokens
```

### UI Components
```typescript
// Various UI components with unused exports
- ErrorBoundary
- StatusIndicator
- ServerCard
- DashboardHeader
- Multiple Radix UI component exports
```

### Utility Functions
```typescript
// lib/agents/load-agent.ts
- loadAgent
- invalidateAgentCache
- clearAllAgentCaches

// lib/chat-store/chats/api.ts
- getChatsForUserInDb
- updateChatTitleInDb
- deleteChatInDb
```

## 5. Debug/Development Code

### Console.log Statements (High Priority Cleanup)
```typescript
// Found in multiple files:
- instrumentation.ts: 2 instances
- components/pwa/install-prompt.tsx: 2 instances
- components/offline/offline-indicator.tsx: 6 instances
- lib/mcp/enhanced-integration.ts: 1 instance
- lib/sync/background-sync.ts: 8 instances
- lib/mcp/enhanced/metrics-collector.ts: 4 instances
- lib/mcp/config-watcher.ts: 15 instances
- And many more...
```

### TODO Comments (Technical Debt)
```typescript
// lib/tool-utils.ts
- "TODO: Implement actual file validation logic"

// app/components/chat-input/chat-input.tsx
- Multiple TODOs for toast notifications

// app/components/mcp-servers/modules/components/AddServerModal.tsx
- TODOs for retries field

// app/api/chat/db.ts
- TODOs for toolCalls integration

// app/api/mcp/config/route.ts
- TODOs for all CRUD operations
```

## 6. Commented Out Code (Immediate Cleanup)

### Commented Imports
```typescript
// middleware.ts
- "// import { appLogger } from "@/lib/logger" // Now unused"

// middleware/logging.ts
- "// import { appLogger } from '@/lib/logger'; // Remove appLogger import"
- "// import { HttpLogEntry, LoggingMiddlewareConfig } from '@/lib/logger/types'; // Remove HttpLogEntry"

// middleware/error-handler.ts
- "// import { appLogger } from '@/lib/logger'; // Now unused"
- "import { getCurrentCorrelationId /*, getCurrentContext*/ } from '@/lib/logger/correlation'; // getCurrentContext is unused"
```

### Legacy Code Comments
```typescript
// Multiple files contain comments like:
- "// Now unused"
- "// Remove appLogger import"
- "// To be removed by commenting out Express fns"
- "// Legacy compatibility"
- "// Removed unused interface"
```

## 7. Recommendations

### Immediate Actions (High Priority)
1. **Remove unused dependencies** from package.json to reduce bundle size
2. **Add missing dependencies** to package.json for proper dependency management
3. **Remove console.log statements** from production code
4. **Delete commented out imports/exports** 
5. **Remove unused files** that are not referenced anywhere

### Medium Priority Actions
1. **Clean up unused exports** - Start with API functions and core utilities
2. **Address TODO comments** - Either implement or remove
3. **Remove debug code** - debugger statements, test-only code
4. **Consolidate icon components** - Many provider icons are unused

### Low Priority Actions
1. **Review unused UI components** - Some might be legitimate future features
2. **Clean up type definitions** - Remove unused interfaces and types
3. **Optimize large files** - Review files >500 lines for dead code

### Bundle Size Impact
Removing unused dependencies could significantly reduce bundle size:
- `@antv/mcp-server-chart` - Chart library
- `@serwist/next` + `@serwist/sw` - Service worker libraries
- `exa-js` - External API library
- `idb` - IndexedDB wrapper

### Development Workflow Impact
- Clean up will improve IDE performance
- Reduced cognitive load for developers
- Better maintainability
- Faster build times

## 8. Files Requiring Manual Review

These files should be manually reviewed before deletion as they might contain legitimate future features:

1. **PWA-related files** - May be intended for progressive web app features
2. **Offline functionality** - May be part of offline-first architecture
3. **MCP dashboard components** - May be planned features
4. **Agent-related components** - May be part of agent system expansion

## Conclusion

The codebase has significant dead/stale code that should be cleaned up. The analysis reveals:
- 67 unused files (potential for removal)
- 10 unused dependencies (bundle size reduction)
- 270+ unused exports (code clarity)
- Extensive debug code (production readiness)

Priority should be given to removing unused dependencies and debug code first, as these have immediate impact on bundle size and production readiness.