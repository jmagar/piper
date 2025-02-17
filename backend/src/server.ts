import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { initializeServer } from './modules/server.js';
import { createChatController, ChatService, ChatRepository } from './modules/chat/index.js';
import { createToolsHandler } from './modules/tools.js';
import { createServersHandler } from './modules/servers.js';
import { createConfigHandler } from './modules/config.js';
import { MessageCacheService } from './services/cache/message.cache.js';
import { ToolCacheService } from './services/cache/tool.cache.js';
import { SessionCacheService } from './services/cache/session.cache.js';
import { setupWebSocket } from './websocket.js';
import { broadcastLog } from './utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const port = process.env.PORT || 4100;

// Initialize Express and middleware
const app = express();
const httpServer = createServer(app);

// Set up middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Initialize server and set up routes
async function startServer() {
    try {
        // Initialize server components
        const {
            config,
            tools,
            agent,
            cleanup
        } = await initializeServer();

        // Initialize chat dependencies
        const chatRepository = new ChatRepository();
        const messageCache = new MessageCacheService();
        const toolCache = new ToolCacheService();
        const sessionCache = new SessionCacheService();
        const chatService = new ChatService(
            agent,
            chatRepository,
            messageCache,
            toolCache,
            sessionCache
        );

        // Set up route handlers
        const chatController = createChatController(chatService);
        app.post('/chat', chatController.handleChat);
        app.post('/chat/star', chatController.handleStarMessage);
        app.post('/chat/unstar', chatController.handleUnstarMessage);
        app.get('/chat/starred/:userId', chatController.handleGetStarredMessages);
        app.post('/chat/archive', chatController.handleArchiveConversation);
        app.post('/chat/unarchive', chatController.handleUnarchiveConversation);
        app.get('/chat/conversations/:userId', chatController.handleGetConversations);
        app.get('/chat/stats', chatController.handleGetStats);

        app.get('/api/tools', createToolsHandler(tools));
        app.get('/api/servers', createServersHandler(config));
        app.get('/api/config', createConfigHandler(config));

        // Initialize WebSocket server
        setupWebSocket(httpServer);

        // Start HTTP server
        httpServer.listen(port, () => {
            broadcastLog('info', `Server listening on port ${port}`);
        });

        // Handle process signals
        const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
        signals.forEach(signal => {
            process.on(signal, async () => {
                try {
                    await cleanup();
                    process.exit(0);
                } catch (error) {
                    console.error('Error during cleanup:', error);
                    process.exit(1);
                }
            });
        });

    } catch (error) {
        console.error('Server initialization failed:', error);
        process.exit(1);
    }
}

// Start the server
startServer(); 