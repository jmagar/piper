import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import debug from 'debug';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { join } from 'path';
import { readFileSync } from 'fs';
import JSON5 from 'json5';

import app from './app.js';
import { initSocketLogger } from './utils/socket-logger.js';
import { McpServerService } from './services/mcp/server.service.js';

const log = debug('pooper:server');
const error = debug('pooper:server:error');

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize MCP server service
const mcpServerService = new McpServerService(prisma);

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO with comprehensive CORS settings
const io = new SocketIOServer(server, {
  cors: {
    origin: true, // Allow all origins for development (using true instead of * for better compatibility)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With', 
      'Accept', 
      'Origin',
      'Access-Control-Request-Method', 
      'Access-Control-Request-Headers',
      'x-client-hostname',
      'x-client-version'
    ],
    exposedHeaders: ['Content-Length', 'Date', 'Access-Control-Allow-Origin'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400 // 24 hours in seconds
  },
  allowEIO3: true, // Allow Engine.IO 3 for backward compatibility
  transports: ['websocket', 'polling'] // Enable both transports
});

// Initialize socket logger
initSocketLogger(io);

// Initialize MCP servers
async function initMcpServers() {
  try {
    // Read MCP config
    const configPath = process.env.LLM_CONFIG_PATH || join(process.cwd().endsWith('/backend') 
      ? join(process.cwd(), '..') 
      : process.cwd(), 
      'llm_mcp_config.json5');
    
    log('Reading MCP config from:', configPath);
    const configContent = readFileSync(configPath, 'utf-8');
    const config = JSON5.parse(configContent);

    if (!config.mcp_servers) {
      throw new Error('No MCP servers defined in config');
    }

    // Process each server
    for (const [name, serverConfig] of Object.entries(config.mcp_servers)) {
      try {
        // Skip commented out servers
        if (name.startsWith('//')) continue;

        log(`Processing MCP server: ${name}`);

        // Generate WebSocket URL for the server
        // Each server runs on a different port starting from 7001
        const basePort = 7001;
        const serverPort = basePort + Object.keys(config.mcp_servers).indexOf(name);
        const serverUrl = `ws://localhost:${serverPort}`;

        // Find existing server by name
        const existingServer = await prisma.mcpServer.findFirst({
          where: { name }
        });

        // Create or update server in database
        const server = await prisma.mcpServer.upsert({
          where: { 
            id: existingServer?.id || `${name}-${serverPort}` 
          },
          create: {
            id: `${name}-${serverPort}`,
            name,
            url: serverUrl,
            type: 'mcp',
            status: 'active',
            metadata: serverConfig as any
          },
          update: {
            url: serverUrl,
            metadata: serverConfig as any
          }
        });

        // Try to connect to the server
        log(`Connecting to MCP server ${name} at ${serverUrl}...`);
        await mcpServerService.connectToServer(server.id);
        console.log(`Successfully connected to MCP server ${name}`);
        log(`Successfully connected to ${name}`);
      } catch (err) {
        error(`Error processing MCP server ${name}:`, err);
        console.error(`Error connecting to MCP server ${name}:`, err);
      }
    }

    console.log('MCP server initialization complete');
    log('MCP server initialization complete');
  } catch (err) {
    error('Failed to initialize MCP servers:', err);
    console.error('Failed to initialize MCP servers:', err);
  }
}

// Start server
const port = process.env.PORT || 4100;
server.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  log(`Server is running on port ${port}`);
  
  // Initialize MCP servers after server starts
  await initMcpServers();
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  log('SIGTERM received. Starting graceful shutdown...');
  
  // Close all MCP connections and processes
  await mcpServerService.cleanup();
  
  // Close Socket.IO connections
  io.close(() => {
    log('Socket.IO server closed');
  });
  
  // Close HTTP server
  server.close(() => {
    log('HTTP server closed');
  });
  
  // Disconnect Prisma
  await prisma.$disconnect();
  
  process.exit(0);
});
