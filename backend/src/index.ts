import { createServer } from 'http';

import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

import chatRoutes from './routes/chat.routes.js';
import configRoutes from './routes/config.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import healthRoutes from './routes/health.routes.js';
import mcpRoutes from './routes/mcp.routes.js';
import promptRoutes from './routes/prompt.routes.js';
import { initWebSocket } from './websocket.js';

// Initialize environment variables
dotenv.config();

// Initialize Prisma
const prisma = new PrismaClient();

const app = express();

// CORS configuration
const corsOptions = {
    origin: '*',  // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Basic middleware
app.use(cors(corsOptions));
app.use(express.json());

// Handle preflight requests
app.options('*', cors(corsOptions));

// Mount API routes
app.use('/api/health', healthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/config', configRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/prompt', promptRoutes);

// Basic error handling
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ 
        error: {
            message: err.message || 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
    });
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize WebSocket with updated CORS options
const io = initWebSocket(httpServer, prisma);

// Get port from environment or use default
const port = process.env.PORT || 4100;
const serverUrl = `http://localhost:${port}`;
const wsUrl = `ws://localhost:${port}`;

// Start server
httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`WebSocket server running at ws://localhost:${port}`);
    console.log('Environment variables loaded:', {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? '***' : undefined,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '***' : undefined,
        BRAVE_API_KEY: process.env.BRAVE_API_KEY ? '***' : undefined,
        GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PERSONAL_ACCESS_TOKEN ? '***' : undefined,
    });

    // Close Prisma and Socket.IO when app shuts down
    process.on('SIGTERM', async () => {
        console.log('Shutting down server...');
        await prisma.$disconnect();
        await io.close();
        process.exit(0);
    });
});
