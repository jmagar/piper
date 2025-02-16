import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { broadcastLog } from '../utils/logger.js';

// Create a custom logger that broadcasts to WebSocket clients
const logClients = new Set<WebSocket>();

export function setupWebSocket(httpServer: Server): WebSocketServer {
    const wss = new WebSocketServer({ server: httpServer, path: '/ws/logs' });

    // Set up WebSocket connections
    wss.on('connection', (ws: WebSocket) => {
        broadcastLog('info', 'New client connected to logs WebSocket');
        logClients.add(ws);

        ws.on('close', () => {
            broadcastLog('info', 'Client disconnected from logs WebSocket');
            logClients.delete(ws);
        });
    });

    return wss;
}

export function closeAllWebSocketConnections(): void {
    for (const client of logClients) {
        client.terminate();
    }
    logClients.clear();
}

export function broadcastToWebSocketClients(logEntry: { timestamp: string; level: string; message: string }): void {
    logClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(logEntry));
        }
    });
} 