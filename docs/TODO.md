# MCP TODO - Technical Feasibility Analysis & Implementation Roadmap

## 🆕 **New Features Analysis**

### 🔄 Hot reload config.json
**Status:** HIGH FEASIBILITY | **Effort:** 1 hour code generation + 4-6 hours human integration | **Risk:** MEDIUM
**Business Value:** HIGH - Developer experience and operational efficiency

**Current State:** MCP servers loaded once at startup from `config.json`
**Enhancement:** Dynamic config reloading without application restart

**Implementation Strategy:**
```typescript
// lib/mcp/configWatcher.ts
import { watch } from 'fs';
import { getMCPManager } from './mcpManager';

class ConfigWatcher {
  private watcher: fs.FSWatcher | null = null;
  
  startWatching() {
    this.watcher = watch('./config.json', async (eventType) => {
      if (eventType === 'change') {
        console.log('[Config Watcher] config.json changed, reloading...');
        await this.reloadConfig();
      }
    });
  }
  
  private async reloadConfig() {
    try {
      // Gracefully shutdown existing servers
      await getMCPManager().shutdown();
      
      // Clear require cache for config.json
      delete require.cache[require.resolve('../../config.json')];
      
      // Reinitialize with new config
      const newConfig = getAppConfig();
      await initializeMCPManager(newConfig);
      
      console.log('[Config Watcher] ✅ Config reloaded successfully');
    } catch (error) {
      console.error('[Config Watcher] ❌ Config reload failed:', error);
    }
  }
}
```

**Integration Points:**
- Extend `MCPManager` with graceful shutdown methods
- Add config validation before reload
- Implement rollback on reload failure
- Update dashboard to show reload status

---

### ⚡ Prompt caching
**Status:** HIGH FEASIBILITY | **Effort:** 1-2 hours code generation + 1 day human testing/optimization | **Risk:** LOW-MEDIUM
**Business Value:** HIGH - Performance and cost optimization

**Technical Analysis:**
- OpenRouter and Claude support prompt caching natively
- Vercel AI SDK has built-in caching mechanisms
- Redis perfect for prompt cache storage

**Implementation Strategy:**
```typescript
// lib/services/promptCache.ts
interface CachedPrompt {
  hash: string;
  prompt: string;
  systemPrompt: string;
  model: string;
  response: string;
  tokens: { prompt: number; completion: number };
  createdAt: Date;
  hitCount: number;
}

class PromptCache {
  private redis = new Redis(process.env.REDIS_URL);
  
  async getCachedResponse(prompt: string, systemPrompt: string, model: string): Promise<CachedPrompt | null> {
    const hash = this.generateHash(prompt, systemPrompt, model);
    const cached = await this.redis.get(`prompt_cache:${hash}`);
    
    if (cached) {
      const result = JSON.parse(cached) as CachedPrompt;
      // Update hit count
      await this.redis.hincrby(`prompt_stats:${hash}`, 'hitCount', 1);
      return result;
    }
    
    return null;
  }
  
  async cacheResponse(prompt: string, systemPrompt: string, model: string, response: string, tokens: any) {
    const hash = this.generateHash(prompt, systemPrompt, model);
    const cacheEntry: CachedPrompt = {
      hash,
      prompt,
      systemPrompt,
      model,
      response,
      tokens,
      createdAt: new Date(),
      hitCount: 0
    };
    
    // Cache for 24 hours
    await this.redis.setex(`prompt_cache:${hash}`, 86400, JSON.stringify(cacheEntry));
  }
  
  private generateHash(prompt: string, systemPrompt: string, model: string): string {
    return crypto.createHash('sha256')
      .update(`${prompt}|${systemPrompt}|${model}`)
      .digest('hex');
  }
}
```

**Database Schema:**
```sql
CREATE TABLE prompt_cache_stats (
  id SERIAL PRIMARY KEY,
  prompt_hash VARCHAR(64) UNIQUE NOT NULL,
  hit_count INTEGER DEFAULT 0,
  total_tokens_saved BIGINT DEFAULT 0,
  cost_saved DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP DEFAULT NOW()
);
```

---

### 📝 Prompts storage
**Status:** HIGH FEASIBILITY | **Effort:** 2-3 hours code generation + 1-2 days human UI refinement | **Risk:** LOW
**Business Value:** HIGH - Prompt management and reusability

**Database Schema:**
```sql
CREATE TABLE stored_prompts (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  system_prompt TEXT,
  user_prompt_template TEXT,
  variables JSON, -- Template variables
  tags TEXT[],
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_by VARCHAR(255) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stored_prompts_category ON stored_prompts(category);
CREATE INDEX idx_stored_prompts_tags ON stored_prompts USING GIN(tags);
```

**API Design:**
```typescript
// app/api/prompts/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const tags = searchParams.get('tags')?.split(',');
  const search = searchParams.get('search');

  const prompts = await prisma.storedPrompt.findMany({
    where: {
      ...(category && { category }),
      ...(tags && { tags: { hasSome: tags } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    },
    orderBy: { usageCount: 'desc' }
  });

  return NextResponse.json(prompts);
}
```

**UI Components:**
```tsx
// components/prompts/PromptLibrary.tsx
function PromptLibrary() {
  return (
    <div className="space-y-6">
      <PromptSearch />
      <PromptCategories />
      <PromptGrid />
      <CreatePromptDialog />
    </div>
  );
}

function PromptCard({ prompt }: { prompt: StoredPrompt }) {
  const handleUsePrompt = () => {
    // Insert prompt into chat input
    router.push(`/c/new?promptId=${prompt.id}`);
  };
  
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <h3 className="font-medium">{prompt.name}</h3>
          <Badge variant="secondary">{prompt.category}</Badge>
        </div>
        <p className="text-sm text-gray-600">{prompt.description}</p>
        <div className="flex gap-1">
          {prompt.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">
            Used {prompt.usageCount} times
          </span>
          <Button onClick={handleUsePrompt} size="sm">
            Use Prompt
          </Button>
        </div>
      </div>
    </Card>
  );
}
```

---

### 🎨 Artifacts
**Status:** HIGH FEASIBILITY | **Effort:** 3-4 hours code generation + 2-3 days human testing/polish | **Risk:** MEDIUM-HIGH
**Business Value:** HIGH - Claude Artifacts-style rich content generation

**Technical Architecture:**
```typescript
// Types for Artifacts
interface Artifact {
  id: string;
  type: 'code' | 'html' | 'svg' | 'mermaid' | 'document' | 'react-component';
  title: string;
  content: string;
  language?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  messageId: string;
}
```

**Database Schema:**
```sql
CREATE TABLE artifacts (
  id VARCHAR(255) PRIMARY KEY,
  message_id VARCHAR(255) NOT NULL,
  chat_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  language VARCHAR(50),
  metadata JSON,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX idx_artifacts_message_id ON artifacts(message_id);
CREATE INDEX idx_artifacts_chat_id ON artifacts(chat_id);
```

**Artifact Renderer Components:**
```tsx
// components/artifacts/ArtifactRenderer.tsx
function ArtifactRenderer({ artifact }: { artifact: Artifact }) {
  switch (artifact.type) {
    case 'code':
      return <CodeArtifact artifact={artifact} />;
    case 'html':
      return <HTMLArtifact artifact={artifact} />;
    case 'svg':
      return <SVGArtifact artifact={artifact} />;
    case 'mermaid':
      return <MermaidArtifact artifact={artifact} />;
    case 'react-component':
      return <ReactComponentArtifact artifact={artifact} />;
    default:
      return <DocumentArtifact artifact={artifact} />;
  }
}

function CodeArtifact({ artifact }: { artifact: Artifact }) {
  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{artifact.title}</CardTitle>
          <div className="flex gap-2">
            <CopyButton content={artifact.content} />
            <DownloadButton artifact={artifact} />
            <EditButton artifact={artifact} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <SyntaxHighlighter 
          language={artifact.language} 
          style={vscDarkPlus}
        >
          {artifact.content}
        </SyntaxHighlighter>
      </CardContent>
    </Card>
  );
}
```

**AI Integration for Artifact Generation:**
```typescript
// lib/artifacts/artifactDetector.ts
export function detectArtifacts(aiResponse: string): Artifact[] {
  const artifacts: Artifact[] = [];
  
  // Detect code blocks
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(aiResponse)) !== null) {
    const language = match[1] || 'text';
    const content = match[2];
    
    if (content.length > 100) { // Only create artifacts for substantial content
      artifacts.push({
        id: generateId(),
        type: 'code',
        title: `${language.toUpperCase()} Code`,
        content,
        language,
        createdAt: new Date(),
        messageId: '' // Set when saving
      });
    }
  }
  
  // Detect HTML content
  if (aiResponse.includes('<html') || aiResponse.includes('<!DOCTYPE')) {
    // Extract and create HTML artifact
  }
  
  return artifacts;
}
```

---

### 🔍 Search
**Status:** HIGH FEASIBILITY | **Effort:** 2-3 hours code generation + 1-2 days human optimization | **Risk:** LOW-MEDIUM
**Business Value:** HIGH - Content discovery and navigation

**Search Architecture:**
```typescript
// lib/search/searchService.ts
interface SearchResult {
  type: 'chat' | 'message' | 'artifact' | 'prompt';
  id: string;
  title: string;
  content: string;
  snippet: string;
  chatId?: string;
  createdAt: Date;
  relevanceScore: number;
}

class SearchService {
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    // Search chats
    const chatResults = await this.searchChats(query, filters);
    results.push(...chatResults);
    
    // Search messages
    const messageResults = await this.searchMessages(query, filters);
    results.push(...messageResults);
    
    // Search artifacts
    const artifactResults = await this.searchArtifacts(query, filters);
    results.push(...artifactResults);
    
    // Search stored prompts
    const promptResults = await this.searchPrompts(query, filters);
    results.push(...promptResults);
    
    // Sort by relevance score
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
  
  private async searchMessages(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    const messages = await prisma.message.findMany({
      where: {
        content: {
          contains: query,
          mode: 'insensitive'
        },
        ...(filters?.dateRange && {
          createdAt: {
            gte: filters.dateRange.start,
            lte: filters.dateRange.end
          }
        })
      },
      include: {
        chat: true
      },
      take: 50
    });
    
    return messages.map(message => ({
      type: 'message' as const,
      id: message.id,
      title: message.chat.title,
      content: message.content,
      snippet: this.generateSnippet(message.content, query),
      chatId: message.chatId,
      createdAt: message.createdAt,
      relevanceScore: this.calculateRelevance(message.content, query)
    }));
  }
}
```

**Database Optimization:**
```sql
-- Full-text search indexes
CREATE INDEX idx_messages_content_gin ON messages USING GIN(to_tsvector('english', content));
CREATE INDEX idx_chats_title_gin ON chats USING GIN(to_tsvector('english', title));
CREATE INDEX idx_artifacts_content_gin ON artifacts USING GIN(to_tsvector('english', content));
CREATE INDEX idx_stored_prompts_gin ON stored_prompts USING GIN(
  to_tsvector('english', name || ' ' || description || ' ' || COALESCE(user_prompt_template, ''))
);
```

**Global Search UI:**
```tsx
// components/search/GlobalSearch.tsx
function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  const handleSearch = useDeferredValue(query);
  
  useEffect(() => {
    if (handleSearch.length > 2) {
      searchContent(handleSearch).then(setResults);
    } else {
      setResults([]);
    }
  }, [handleSearch]);
  
  return (
    <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
      <CommandInput
        placeholder="Search chats, messages, artifacts..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {results.length === 0 && query.length > 2 && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}
        
        <CommandGroup heading="Recent Chats">
          {results.filter(r => r.type === 'chat').map(result => (
            <SearchResultItem key={result.id} result={result} />
          ))}
        </CommandGroup>
        
        <CommandGroup heading="Messages">
          {results.filter(r => r.type === 'message').map(result => (
            <SearchResultItem key={result.id} result={result} />
          ))}
        </CommandGroup>
        
        <CommandGroup heading="Artifacts">
          {results.filter(r => r.type === 'artifact').map(result => (
            <SearchResultItem key={result.id} result={result} />
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

## 🚀 **Updated Priority Matrix**

### **Priority 0 - Immediate (Claude: 30min-2hrs, Human: hours-1day)**
1. **Hot reload config.json** - Developer experience critical
2. **Track tool usage by server** - Analytics foundation
3. **Fix tools being found twice** - Stability fix

### **Priority 1 - Next Sprint (Claude: 1-3hrs, Human: 1-3 days)**  
4. **Prompt caching** - Performance optimization
5. **Search** - Content discovery essential
6. **Server errors on dashboard** - Operational visibility
7. **Token counting** - Cost management

### **Priority 2 - Medium Term (Claude: 2-4hrs, Human: 3-7 days)**
8. **Prompts storage** - Productivity enhancement
9. **Conversation history** - User experience
10. **Additional message reactions** - Engagement features

### **Priority 3 - Advanced (Claude: 3-6hrs, Human: 1-2 weeks)**
11. **Artifacts** - Rich content generation
12. **Wire up agents to MCP servers** - Advanced configuration
13. **Tasks (Reoccurring)** - Automation platform

---

## 🚀 **Priority 0 - Immediate Implementation (Next 1-2 weeks)**

### ✅ Track tool usage by server
**Status:** HIGH FEASIBILITY | **Effort:** 45 minutes code generation + 4-6 hours human integration | **Risk:** LOW
**Implementation Strategy:**
- **Phase 1:** Add Redis-based real-time counters in `MCPService.invokeTool()` (2-3 days)
- **Phase 2:** Implement database logging with analytics aggregation (2-3 days)  
- **Phase 3:** Create analytics dashboard components (3-5 days)

**Database Schema:**
```sql
CREATE TABLE tool_usage_logs (
  id SERIAL PRIMARY KEY,
  server_key VARCHAR(255) NOT NULL,
  tool_name VARCHAR(255) NOT NULL,
  success BOOLEAN NOT NULL,
  duration_ms INTEGER,
  error_details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Integration Point:** `lib/mcp/mcpManager.ts` - Modify existing tool execution flow
**Security:** Sanitize tool arguments, implement data retention policies

---

### ✅ Fix tools being found twice
**Status:** HIGH FEASIBILITY | **Effort:** 30 minutes code generation + 2-3 hours human testing | **Risk:** LOW
**Root Cause:** Duplicate tool registration in `getCombinedMCPToolsForAISDK()` 
**Solution:** Add deduplication logic with comprehensive logging

**Implementation:**
```typescript
// Enhanced tool deduplication in mcpManager.ts
const toolRegistry = new Map<string, string>(); // toolName -> serverKey
// Add duplicate detection and warning system
```

**Testing:** Unit tests for duplicate scenarios, HMR regression testing

---

## 🎯 **Priority 1 - Next Sprint (2-4 weeks)**

### 📊 Server errors on dashboard
**Status:** HIGH FEASIBILITY | **Effort:** 1-2 hours code generation + 1 day human UI/testing | **Risk:** LOW-MEDIUM
**Current:** Basic error status in MCP dashboard
**Enhancement:** Error categorization, history, real-time updates, troubleshooting actions

**Implementation:**
- Extend `ManagedServerInfo` interface with error details
- Add error timeline and metrics to dashboard
- Implement SSE for real-time error monitoring
- Create error recovery mechanisms

---

### 💬 Conversation history
**Status:** HIGH FEASIBILITY | **Effort:** 2-3 hours code generation + 1 day human UI refinement | **Risk:** LOW-MEDIUM
**Database:** Already has Chat/Message models
**Features:** Search, filtering, pagination, date ranges

**New API Endpoints:**
- `/api/chats/history` - Advanced search and filtering
- Full-text search with PostgreSQL GIN indexes
- Conversation browser UI with search highlighting

---

### 🔢 Token counting
**Status:** HIGH FEASIBILITY | **Effort:** 2-3 hours code generation + 1-2 days human integration/optimization | **Risk:** MEDIUM
**AI SDK Integration:** Extract token usage from `streamText()` responses
**Features:** Usage tracking, rate limiting, cost estimation, analytics dashboard

**Database Schema:**
```sql
ALTER TABLE "Usage" ADD COLUMN daily_tokens_used INTEGER DEFAULT 0;
CREATE TABLE token_usage_logs (
  id SERIAL PRIMARY KEY,
  model_name VARCHAR(255) NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  cost_estimate DECIMAL(10,4)
);
```

---

## 🔮 **Priority 2 - Future Development (1-2 months)**

### 😄 Additional message reactions
**Status:** HIGH FEASIBILITY | **Effort:** 1 hour code generation + 4-6 hours human UI/testing | **Risk:** LOW-MEDIUM
**Features:** Emoji reactions, reaction counts, real-time updates

**Database Schema:**
```sql
CREATE TABLE message_reactions (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(255) NOT NULL,
  reaction_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, user_id, reaction_type)
);
```

---

### 🤖 Wire up agents to load servers from config.json
**Status:** HIGH FEASIBILITY | **Effort:** 2-3 hours code generation + 1 week human integration/testing | **Risk:** MEDIUM
**Current:** Agent model has `mcp_config` JSON field
**Enhancement:** Agent-specific MCP server selection, tool filtering

**Agent MCP Config:**
```typescript
interface AgentMCPConfig {
  enabledServers: string[];
  toolFilters?: { allowed?: string[]; denied?: string[]; };
  serverOverrides?: Record<string, Partial<ServerConfigEntry>>;
}
```

---

## 🔬 **Priority 3 - Advanced Features (2-3 months)**

### ⏰ Tasks (Reoccurring)
**Status:** HIGH FEASIBILITY | **Effort:** 4-6 hours code generation + 2-3 weeks human infrastructure/testing | **Risk:** HIGH
**Architecture:** Task scheduler + MCP tool executor + management UI

**Core Components:**
- Task scheduling engine with cron expressions
- Task executor using existing MCP tools  
- Database schema for tasks and execution logs
- Management UI for task creation/monitoring
- Docker integration for background scheduler service

**Database Schema:**
```sql
CREATE TABLE recurring_tasks (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  schedule VARCHAR(100) NOT NULL, -- Cron expression
  mcp_tools JSON NOT NULL,
  parameters JSON,
  status VARCHAR(50) DEFAULT 'active'
);
```

---

## 📋 **Technical Debt & Improvements**

### 🔧 Enhanced MCP Error handling/logging + MCP Logviewer Component
- Fetch: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#handling-errors
- Implement structured error handling across MCP transport types
- Create log viewer component for debugging MCP interactions

### 🚀 Break client.ts down by transport type
- stdio-client.ts, sse-client.ts, streamable-client.ts
- Fetch: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http

### ⚡ Streaming & Advanced Features
- **Cancellation:** https://modelcontextprotocol.io/specification/2025-03-26/basic/utilities/cancellation
- **Progress:** https://modelcontextprotocol.io/specification/2025-03-26/basic/utilities/progress
- **Roots:** https://modelcontextprotocol.io/specification/2025-03-26/client/roots
- **Sampling:** https://modelcontextprotocol.io/specification/2025-03-26/client/sampling
- **Multi-modal tool results:** https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#multi-modal-tool-results

---

## 🎨 **UI/UX Enhancements**

- **Streaming tools** - Real-time tool execution feedback
- **Share chats** - URL sharing with public/private controls
- **Rules** - Configurable chat behavior rules
- **Flows** - Multi-step automated workflows
- **Title generation** - Auto-generate chat titles from content
- **Add context to chat** - File uploads, external data sources
- **Integrate with crawl4mcp** - Web content ingestion
- **Generative UI** - Dynamic UI generation based on context
- **Tool calls displayed in the correct place in the chat** - Better UX for tool execution
- **Mistakenly calling multiple tools** - Improved tool selection logic
- **Multi-modal chat** - Image, file, voice support
- **Enhance tool call results** - Rich formatting and visualization
- **Memory Bank** - Persistent conversation context

---

## 🏗️ **Infrastructure & Architecture**

### 📱 Add MCP servers via UI (config.json)
- Dynamic MCP server configuration through admin UI
- Validation and testing of server connections
- Hot-reloading of MCP server configurations

### ⚙️ Configurable System prompt
- Per-chat and per-agent system prompt customization
- Template system for reusable prompts
- Prompt versioning and A/B testing

---

## 🧠 **Development Guidelines**

### **Implementation Priorities:**
1. **P0:** Critical fixes and basic analytics (Track usage, Fix duplicates)
2. **P1:** Core feature enhancements (Errors, History, Tokens)  
3. **P2:** User experience improvements (Reactions, Agent configs)
4. **P3:** Advanced automation (Recurring tasks, Complex workflows)

### **Technical Standards:**
- All new features must include comprehensive tests
- Database migrations with proper rollback strategies
- API endpoints follow existing authentication patterns
- UI components use established shadcn/ui patterns
- MCP integrations follow transport-agnostic patterns

### **Performance Requirements:**
- Database queries optimized with proper indexing
- Redis caching for real-time data
- Async operations for non-blocking user experience
- Resource limits for background tasks

### **Security Checklist:**
- Input validation and sanitization
- Authorization checks for all new endpoints
- Audit logging for administrative actions
- Data retention and privacy compliance

MCP TODO:

Break client.ts down by transport type
    - stdio-client.ts, sse-client.ts, streamable-client.ts
        - fetch https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http
    
Enhanced MCP Error handling/logging + MCP Logviewer Component:
    - fetch https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#handling-errors
    - fetch https://modelcontextprotocol.io/specification/2025-03-26/basic
    - fetch https://modelcontextprotocol.io/specification/2025-03-26/basic/lifecycle#error-handling
    - fetch https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http
    - fetch https://modelcontextprotocol.io/docs/concepts/tools#error-handling-2
    - fetch https://ai-sdk.dev/docs/ai-sdk-core/error-handling

Cancellation:
    - fetch https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
    - fetch https://modelcontextprotocol.io/specification/2025-03-26/basic/utilities/cancellation

Progress:
    - fetch https://modelcontextprotocol.io/specification/2025-03-26/basic/utilities/progress

Roots:
    - fetch https://modelcontextprotocol.io/specification/2025-03-26/client/roots

Sampling:
    - fetch https://modelcontextprotocol.io/specification/2025-03-26/client/sampling

Multi-modal tool results:
    - fetch https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#multi-modal-tool-results

Track tool usage by server

Server errors on dashboard

Wire up agents to load servers from config.json

Fix tools being found twice

Additional message reactions

Token counting

Tasks(Reoccurring)

Conversation history

Add MCP servers via UI (config.json)

Configurable System prompt

Streaming tools

Share chats

Rules

Flows

Title generation

Add context to chat

Integrate with crawl4mcp

Generative UI

Tool calls displayed in the correct place in the chat

Mistakenly calling multiple tools

Multi-modal chat

Enhance tool call results

Memory Bank



