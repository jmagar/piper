import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import type { ExtendedChatMessage } from './types/chat.js';
import type { ServerStatus } from './types/server.js';
import { broadcastLog } from './utils/logger.js';

// Global WebSocket server instance
let io: Server;

export function setupWebSocket(httpServer: HTTPServer) {
    io = new Server(httpServer);

    io.on('connection', (socket) => {
        // Extract user info from headers set by reverse proxy
        const userId = socket.handshake.headers['x-user-id'] as string;
        const username = socket.handshake.headers['x-username'] as string;

        if (!userId || !username) {
            socket.disconnect();
            return;
        }

        broadcastLog('info', `User ${username} connected`);

        // Handle message events
        socket.on('message:send', async (message: ExtendedChatMessage) => {
            socket.broadcast.emit('message:new', message);
        });

        socket.on('message:update', async (message: ExtendedChatMessage) => {
            socket.broadcast.emit('message:update', message);
        });

        // Handle disconnection
        socket.on('disconnect', async () => {
            broadcastLog('info', `User ${username} disconnected`);
        });
    });

    return io;
}

// Function to publish server status updates via WebSocket
export async function publishServerStatus(_unused: unknown, serverName: string, status: ServerStatus) {
    if (!io) {
        return; // WebSocket server not initialized yet
    }
    io.emit('server:status', {
        serverName,
        ...status,
        timestamp: new Date().toISOString()
    });
} 