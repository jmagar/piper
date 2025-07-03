# Piper Codebase Cleanup Tasks

This file tracks the cleanup of unused code, dependencies, and exports identified by `knip` analysis.

## Progress Overview

- [ ] **Phase 1**: Remove unused files (66 files)
- [ ] **Phase 2**: Remove unused dependencies (8 dependencies)
- [ ] **Phase 3**: Remove unused dev dependencies (17 dependencies)
- [ ] **Phase 4**: Clean up unused exports (270 exports)
- [ ] **Phase 5**: Remove unused types (163 types)

---

## Phase 1: Unused Files (66 files)

### Completed Tasks
- [x] Remove `lib/agents/tools.ts` and `lib/agents/tools/` directory
- [x] Clean up `app/components/chat/get-sources.ts` (removed dead code)

### Chat Input Components
- [ ] `app/components/chat-input/agent-command.tsx`
- [ ] `app/components/chat-input/agents.tsx`
- [ ] `app/components/chat-input/button-file-upload.tsx`
- [ ] `app/components/chat-input/file-items.tsx`
- [ ] `app/components/chat-input/file-list.tsx`
- [ ] `app/components/chat-input/prompt-command.tsx`
- [ ] `app/components/chat-input/selected-url-display.tsx`
- [ ] `app/components/chat-input/suggestions.tsx`
- [ ] `app/components/chat-input/tool-command.tsx`

### Chat Components
- [ ] `app/components/chat/feedback-widget.tsx`
- [ ] `app/components/chat/reasoning.tsx`
- [ ] `app/components/chat/tool-invocation.tsx`
- [ ] `app/components/chat/use-file-upload.ts`

### Layout Components
- [ ] `app/components/header-go-back.tsx`
- [ ] `app/components/layout/agent-link.tsx`
- [ ] `app/components/layout/app-info/app-info-content.tsx`
- [ ] `app/components/layout/app-info/app-info-trigger.tsx`
- [ ] `app/components/layout/feedback/feedback-trigger.tsx`
- [ ] `app/components/layout/header-agent.tsx`
- [ ] `app/components/layout/prompt-link.tsx`
- [ ] `app/components/layout/settings/connections-section.tsx`
- [ ] `app/components/layout/theme-toggle.tsx`

### MCP Dashboard (Entire Feature)
- [ ] `app/components/mcp-dashboard/log-viewer-placeholder.tsx`
- [ ] `app/components/mcp-dashboard/monitoring-placeholder.tsx`

### Agent Components
- [ ] `app/components/agents/research-section.tsx`

### Suggestions
- [ ] `app/components/suggestions/prompt-system.tsx`

### Public Pages
- [ ] `app/p/[chatId]/article.tsx`
- [ ] `app/p/[chatId]/header.tsx`

### PWA/Service Worker
- [ ] `app/sw.ts`
- [ ] `public/sw.js`

### API Components
- [ ] `app/api/chat/messageTransformer.ts`

### Types
- [ ] `app/types/user.ts`

### UI Components
- [ ] `components/common/feedback-form.tsx`
- [ ] `components/layout/app-shell.tsx`
- [ ] `components/ui/skeleton-screens.tsx`

### Icon Components
- [ ] `components/icons/anthropic.tsx`
- [ ] `components/icons/claude.tsx`
- [ ] `components/icons/deepseek.tsx`
- [ ] `components/icons/gemini.tsx`
- [ ] `components/icons/google.tsx`
- [ ] `components/icons/grok.tsx`
- [ ] `components/icons/mistral.tsx`
- [ ] `components/icons/openai.tsx`
- [ ] `components/icons/openrouter.tsx`
- [ ] `components/icons/xai.tsx`

### Motion/Animation Components
- [ ] `components/motion-primitives/morphing-popover.tsx`
- [ ] `components/motion-primitives/progressive-blur.tsx`

### Prompt Kit Components
- [ ] `components/prompt-kit/prompt-suggestion.tsx`
- [ ] `components/prompt-kit/reasoning.tsx`
- [ ] `components/prompt-kit/response-stream.tsx`

### Library Files
- [ ] `lib/api-admin.ts`
- [ ] `lib/file-handling.ts`
- [ ] `lib/hooks/useOfflineChat.ts`
- [ ] `lib/logger/base.ts`
- [ ] `lib/logger/rotation-config.ts`
- [ ] `lib/logger/security.ts`
- [ ] `lib/models/data/gemini.ts`
- [ ] `lib/models/data/llama.ts`
- [ ] `lib/motion.ts`
- [ ] `lib/offline-storage.ts`
- [ ] `lib/openproviders/env.ts`
- [ ] `lib/providers/index.ts`
- [ ] `lib/pwa/performance.ts`
- [ ] `lib/server/api.ts`
- [ ] `lib/sync/background-sync.ts`
- [ ] `lib/usage.ts`

---

## Phase 2: Unused Dependencies (8 dependencies)

- [ ] `@antv/mcp-server-chart`
- [ ] `@modelcontextprotocol/sdk`
- [ ] `@modelcontextprotocol/server-sequential-thinking`
- [ ] `@serwist/sw`
- [ ] `@types/express`
- [ ] `exa-js`
- [ ] `idb`
- [ ] `tailwindcss-animate`

---

## Phase 3: Unused Dev Dependencies (17 dependencies)

- [ ] `@21st-dev/magic`
- [ ] `@andredezzy/deep-directory-tree-mcp`
- [ ] `@modelcontextprotocol/server-filesystem`
- [ ] `@next/bundle-analyzer`
- [ ] `@sylphlab/pdf-reader-mcp`
- [ ] `@tailwindcss/typography`
- [ ] `@types/ioredis`
- [ ] `eslint`
- [ ] `eslint-config-next`
- [ ] `eslint-plugin-react-hooks`
- [ ] `mcp-mermaid`
- [ ] `mcp-searxng`
- [ ] `repomix`
- [ ] `tailwindcss`
- [ ] `tsconfig-paths`
- [ ] `tw-animate-css`
- [ ] `youtube-vision`

---

## Phase 4: Missing Dependencies (18 unlisted)

These dependencies are used but not listed in package.json:

- [ ] Add `@ai-sdk/ui-utils`
- [ ] Add `json-schema`
- [ ] Add `nanoid`
- [ ] Add `framer-motion`
- [ ] Add `@ai-sdk/react`
- [ ] Add `logform`
- [ ] Add `@ai-sdk/provider`

---

## Phase 5: Unused Exports (270 exports)

This phase will involve going through each file and removing unused exported functions, classes, and variables. Due to the large number, we'll tackle this systematically by file/directory.

### High Priority Files with Many Unused Exports:
- [ ] `lib/logger/` directory (many unused logging utilities)
- [ ] `lib/mcp/` directory (many unused MCP utilities)
- [ ] `components/ui/` directory (many unused UI component variants)
- [ ] `app/api/chat/` directory (unused API utilities)

---

## Phase 6: Unused Types (163 types)

Similar to exports, we'll clean up unused TypeScript interfaces and types systematically.

---

## Notes

- **Safety First**: Before removing any file, double-check it's not dynamically imported or referenced in ways `knip` might miss
- **Test After Each Phase**: Run the application after each major cleanup phase to ensure nothing breaks
- **Commit Frequently**: Make small, focused commits for easy rollback if needed
- **Update Documentation**: Remove references to deleted features from README and docs

---

## Commands for Cleanup

```bash
# Remove unused dependencies
npm uninstall @antv/mcp-server-chart @modelcontextprotocol/sdk exa-js tailwindcss-animate @serwist/sw @types/express idb @modelcontextprotocol/server-sequential-thinking

# Remove unused dev dependencies  
npm uninstall -D @21st-dev/magic @andredezzy/deep-directory-tree-mcp @modelcontextprotocol/server-filesystem @next/bundle-analyzer @sylphlab/pdf-reader-mcp @tailwindcss/typography @types/ioredis eslint eslint-config-next eslint-plugin-react-hooks mcp-mermaid mcp-searxng repomix tailwindcss tsconfig-paths tw-animate-css youtube-vision

# Add missing dependencies
npm install @ai-sdk/ui-utils json-schema nanoid framer-motion @ai-sdk/react logform @ai-sdk/provider
``` 