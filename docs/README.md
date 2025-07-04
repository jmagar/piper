# Piper Documentation

Welcome to the Piper project documentation. This directory contains comprehensive documentation organized by category.

## 📁 Documentation Structure

### 🏗️ Architecture (`architecture/`)
Technical architecture and system design documentation:

- **[logging-system.md](architecture/logging-system.md)** - Comprehensive logging system documentation
- **[mcp-implementation-revision-plan.md](architecture/mcp-implementation-revision-plan.md)** - MCP architecture and implementation plans
- **[config-schema.md](architecture/config-schema.md)** - Configuration schema and validation
- **[ai-sdk-v4-mcp-research-analysis.md](architecture/ai-sdk-v4-mcp-research-analysis.md)** - AI SDK v4 and MCP integration research

### 🛠️ Development (`development/`)
Development guides, analysis, and troubleshooting:

- **[mcp-cache-invalidation.md](development/mcp-cache-invalidation.md)** - Cache management and debugging
- **[abort-signals-implementation.md](development/abort-signals-implementation.md)** - Deprecated abort controller implementation
- **[api-route-analysis.md](development/api-route-analysis.md)** - API route structure analysis and recommendations  
- **[chat_api_analysis_notes.md](development/chat_api_analysis_notes.md)** - Chat API implementation analysis
- **[token-optimization-analysis.md](development/token-optimization-analysis.md)** - Token usage optimization strategies
- **[TOOL_OPTIMIZATION_FALLBACK.md](development/TOOL_OPTIMIZATION_FALLBACK.md)** - Tool optimization and fallback strategies
- **[test-connection_api_analysis_notes.md](development/test-connection_api_analysis_notes.md)** - MCP test connection API analysis

### 👥 User Guides (`user-guides/`)
User-facing documentation and guides:

*Coming soon - this section will contain user manuals, tutorials, and getting started guides.*

### 🎯 Prompts (`prompts/`)
AI prompt templates and configurations:

- **[codeweaver.md](prompts/codeweaver.md)** - CodeWeaver AI assistant configuration
- **[context-condensing.md](prompts/context-condensing.md)** - Context condensing strategies
- **[piper.md](prompts/piper.md)** - Main Piper AI assistant configuration

## 📋 Core Documentation

- **[CODEBASE_ANALYSIS_REPORT.md](CODEBASE_ANALYSIS_REPORT.md)** - Comprehensive codebase analysis and improvement recommendations

## 🔗 Related Documentation

### Component Documentation
- [MCP Components](../components/mcp/README.md) - MCP Server Management UI components
- [Enhanced MCP Client](../lib/mcp/enhanced/README.md) - Modular MCP client implementation

### Development Scripts
- [Scripts Documentation](../scripts/README.md) - Development and build scripts

### Configuration
- [.cursor Rules](../.cursor/rules/) - Cursor IDE rules and configurations

## 🚀 Quick Navigation

**For Developers:**
- Start with [CODEBASE_ANALYSIS_REPORT.md](CODEBASE_ANALYSIS_REPORT.md) for project overview
- Check [development/](development/) for implementation guides
- Review [architecture/](architecture/) for system design

**For Architecture:**
- Review [architecture/logging-system.md](architecture/logging-system.md) for logging patterns
- Check [architecture/config-schema.md](architecture/config-schema.md) for configuration
- See [architecture/mcp-implementation-revision-plan.md](architecture/mcp-implementation-revision-plan.md) for MCP design

**For Troubleshooting:**
- See [development/mcp-cache-invalidation.md](development/mcp-cache-invalidation.md) for cache issues
- Check [development/](development/) for analysis and debugging guides

## 📝 Contributing to Documentation

When adding new documentation:

1. **Choose the right category:**
   - `architecture/` - System design, patterns, technical architecture
   - `development/` - Implementation guides, analysis, troubleshooting
   - `user-guides/` - User-facing tutorials and manuals
   - `prompts/` - AI prompt configurations

2. **Follow naming conventions:**
   - Use kebab-case for filenames (e.g., `api-route-analysis.md`)
   - Include descriptive titles and clear structure
   - Add entry to this README.md index

3. **Maintain organization:**
   - Keep related documents together
   - Cross-reference between documents when helpful
   - Update this index when adding new files

---

*This documentation structure supports the Piper project's goal of maintaining clear, organized, and accessible documentation for all contributors.* 