import type { ExtendedChatMessage } from '@/types/chat';

/**
 * Default welcome messages shown when starting a new chat
 */
export const WELCOME_MESSAGES: ExtendedChatMessage[] = [
    {
        id: 'system-intro',
        role: 'system',
        content: "This is a new chat session. The AI assistant will help you with coding tasks, using various tools and following best practices.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: 'system',
        status: 'delivered',
        metadata: {
            timestamp: new Date().toISOString(),
            streamStatus: 'complete'
        }
    },
    {
        id: 'welcome',
        role: 'assistant',
        content: `# 👋 Welcome to Your AI Coding Assistant!

I'm here to help you with your development tasks. Here's what I can do:

\`\`\`markdown
Core Capabilities:
├── 🔍 Code Analysis
│   ├── Search and navigate codebases
│   ├── Debug issues and optimize performance
│   └── Review and suggest improvements
│
├── 💻 Code Generation
│   ├── Create new components and features
│   ├── Modify existing code safely
│   └── Follow project standards and best practices
│
├── 🛠️ Development Tools
│   ├── File and directory management
│   ├── Git operations
│   └── Package management
│
└── 📚 Knowledge Support
    ├── Answer programming questions
    ├── Explain concepts and patterns
    └── Provide documentation and examples
\`\`\`

I'm integrated with your development environment and can directly help with:
- Searching and reading files
- Making code changes
- Running commands
- Managing your project

**Ready to get started?** Let me know what you'd like to work on!`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: 'text',
        status: 'delivered',
        metadata: {
            timestamp: new Date().toISOString(),
            streamStatus: 'complete'
        }
    }
]; 