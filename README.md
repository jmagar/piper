# 🚀 Pooper - Model Context Protocol Client

A modern, beautiful web interface for interacting with AI models through the Model Context Protocol (MCP). Built with Next.js, TypeScript, and shadcn/ui. The backend is based on [mcp-client-langchain-ts](https://github.com/hideya/mcp-client-langchain-ts), a robust TypeScript implementation of the MCP client using LangChain.

## ✨ Features

### 💬 Chat Interface
- Real-time chat with AI models
- Beautiful message bubbles with syntax highlighting
- Support for markdown and code blocks
- Message reactions and editing
- Copy and regenerate responses
- Star/favorite important messages
- Conversation history with search and filtering
- Conversation archiving

### 🛠️ MCP Tools Integration
- Visual tool explorer with categorized view
- Real-time tool execution feedback
- Comprehensive tool documentation
- Tool usage statistics
- Currently supported MCP servers:
  - 📂 Filesystem - File and directory operations
  - 🌤️ Weather - Weather information service
  - 🔍 Brave Search - Web search capabilities
  - 🌐 Puppeteer - Web browsing and screenshots
  - ⏰ Time - Time-related operations
  - 📦 Package Docs - NPM package documentation
  - 🌐 Fetch - HTTP request handling
  - 🐙 GitHub - GitHub repository interactions
  - 📝 Documentation - Markdown and text processing
  - 🔬 WCGW - What Could Go Wrong analysis tool

### 📊 Server Management
- Real-time server status monitoring
- Server health checks
- Environment variable management
- Tool availability tracking
- Server statistics dashboard

### 📝 Logging System
- Real-time log streaming via WebSocket
- Beautiful log visualization
- Log level filtering
- Timestamp formatting
- Auto-scrolling with manual override

### 🎨 User Interface
- Modern, clean design
- Dark/Light mode support
- Responsive layout
- Smooth animations
- Accessibility focused
- Real-time typing indicators
- Online status tracking

### 🗄️ Data Management
- PostgreSQL for persistent storage
- Redis for caching and real-time features
- Message and conversation archiving
- Tool result caching
- Rate limiting
- Session management

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm
- PostgreSQL 16+
- Redis 7+
- Model Context Protocol servers
- Python 3.8+ (for some MCP servers)
- `uv` package manager (for Python-based servers)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jmagar/piper.git
cd piper
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
pnpm install

# Install frontend dependencies
cd ../frontend
pnpm install
```

3. Configure environment variables:
```bash
# Copy the template to project root
cp .env.template .env
# Edit .env with your configuration and API keys:
# - ANTHROPIC_API_KEY
# - OPENAI_API_KEY (optional)
# - BRAVE_API_KEY
# - GITHUB_PERSONAL_ACCESS_TOKEN
# - Database and Redis configuration
```

4. Start the infrastructure services:
```bash
# Start PostgreSQL and Redis
docker-compose up -d
```

5. Initialize the database:
```bash
cd backend
pnpm prisma migrate dev
pnpm prisma db seed
```

6. Start the development servers:
```bash
# Terminal 1: Start the backend
cd backend
pnpm run dev:server

# Terminal 2: Start the frontend
cd frontend
pnpm dev
```

7. Open [http://localhost:3002](http://localhost:3002) in your browser.

## 🏗️ Project Structure

```
pooper/
├── .env                # Environment variables
├── .env.template      # Environment template
├── docker-compose.yml # Docker services configuration
├── llm_mcp_config.json5 # MCP configuration
│
├── backend/          # Express.js backend
│   ├── src/         # Source files
│   │   ├── modules/ # Server modules
│   │   ├── types/   # TypeScript types
│   │   └── utils/   # Utility functions
│   ├── prisma/      # Database schema and migrations
│   └── tests/       # Test files
│
├── frontend/        # Next.js frontend
│   ├── app/        # App router pages
│   ├── components/ # React components
│   │   ├── ui/    # UI components
│   │   └── ...    # Feature components
│   └── lib/       # Utility functions
```

## 🧩 Technologies

### Backend
- Express.js
- TypeScript
- WebSocket
- LangChain
- Model Context Protocol
- Prisma ORM
- Redis
- PostgreSQL

### Frontend
- Next.js 15
- React
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Lucide Icons
- Sonner Toasts

## 📝 Configuration

### MCP Servers
Configure your MCP servers in `llm_mcp_config.json5`:

```json5
{
  "llm": {
    "model_provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "temperature": 0.7,
    "max_tokens": 1000,
  },
  "mcp_servers": {
    // Server configurations...
  }
}
```

### Environment Variables
Required environment variables:
- `ANTHROPIC_API_KEY` - Anthropic API key
- `OPENAI_API_KEY` - OpenAI API key (optional)
- `BRAVE_API_KEY` - Brave Search API key
- `GITHUB_PERSONAL_ACCESS_TOKEN` - GitHub Personal Access Token
- Database and Redis configuration
- CORS and port settings

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [mcp-client-langchain-ts](https://github.com/hideya/mcp-client-langchain-ts) for the excellent base MCP client implementation
- [Model Context Protocol](https://github.com/modelcontextprotocol/protocol) for the amazing protocol
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful components
- [Lucide](https://lucide.dev/) for the icons
- All our contributors and users!
