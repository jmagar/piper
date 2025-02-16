# 🚀 Pooper - Model Context Protocol Client

A modern, beautiful web interface for interacting with AI models through the Model Context Protocol (MCP). Built with Next.js, TypeScript, and shadcn/ui.

## ✨ Features

### 💬 Chat Interface
- Real-time chat with AI models
- Beautiful message bubbles with syntax highlighting
- Support for markdown and code blocks
- Message reactions and editing
- Copy and regenerate responses

### 🛠️ MCP Tools Integration
- Visual tool explorer
- Real-time tool execution feedback
- Comprehensive tool documentation
- Tool usage statistics

### 📊 Server Management
- Real-time server status monitoring
- Server health checks
- Environment variable management
- Tool availability tracking

### 📝 Logging System
- Real-time log streaming
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

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm
- Model Context Protocol servers

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
# Backend
cp backend/.env.template backend/.env
# Edit backend/.env with your API keys

# Frontend
cp frontend/.env.template frontend/.env.local
# Edit frontend/.env.local with your configuration
```

4. Start the development servers:
```bash
# Terminal 1: Start the backend
cd backend
pnpm dev

# Terminal 2: Start the frontend
cd frontend
pnpm dev
```

5. Open [http://localhost:3002](http://localhost:3002) in your browser.

## 🏗️ Project Structure

```
pooper/
├── backend/             # Express.js backend
│   ├── src/            # Source files
│   └── tests/          # Test files
├── frontend/           # Next.js frontend
│   ├── app/           # App router pages
│   ├── components/    # React components
│   └── lib/           # Utility functions
└── docs/              # Documentation
```

## 🧩 Technologies

### Backend
- Express.js
- TypeScript
- WebSocket
- LangChain
- Model Context Protocol

### Frontend
- Next.js 14
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide Icons

## 📝 Configuration

### MCP Servers
Configure your MCP servers in `llm_mcp_config.json5`:

```json5
{
  "llm": {
    "model_provider": "openai",
    "model": "gpt-4",
    // ...
  },
  "mcp_servers": {
    // ...
  }
}
```

### Environment Variables
Required environment variables:
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key (optional)
- `BRAVE_API_KEY` - Brave Search API key (optional)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Model Context Protocol](https://github.com/modelcontextprotocol/protocol) for the amazing protocol
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful components
- [Lucide](https://lucide.dev/) for the icons
- All our contributors and users!
