import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { initializeServer } from './modules/server.js';
import { createChatHandler } from './modules/chat.js';
import { createToolsHandler } from './modules/tools.js';
import { createServersHandler } from './modules/servers.js';
import { createConfigHandler } from './modules/config.js';
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

// CORS configuration
const requiredPorts = ['3000', '3002', '4100'];
const baseOrigins = process.env.CORS_ALLOWED_ORIGINS ? 
    process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) :
    ['localhost', '127.0.0.1'];

// Generate all required origin combinations
const allowedOrigins = baseOrigins.flatMap(host => {
    // Remove any existing protocol or port
    const cleanHost = host.replace(/^https?:\/\//, '').split(':')[0];
    return requiredPorts.map(port => `http://${cleanHost}:${port}`);
});

const corsOptions = {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
};

// Log CORS configuration
broadcastLog('info', 'CORS configuration:');
broadcastLog('info', `Base hosts/IPs: ${baseOrigins.join(', ')}`);
broadcastLog('info', `Allowed origins: ${allowedOrigins.join(', ')}`);

// Set up middleware
app.use(cors(corsOptions));
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

        // Set up route handlers
        app.post('/chat', createChatHandler(agent));
        app.get('/tools', createToolsHandler(tools));
        app.get('/servers', createServersHandler(config, tools));
        app.get('/config', createConfigHandler(config));

        // Start HTTP server
        httpServer.listen({ port: port, host: '0.0.0.0' }, () => {
            broadcastLog('info', `Server listening on all interfaces at port ${port}`);
            broadcastLog('info', `You can access it via:`);
            broadcastLog('info', `- http://localhost:${port}`);
            broadcastLog('info', `- http://YOUR_IP:${port}`);
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