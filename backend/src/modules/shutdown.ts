import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { broadcastLog } from '../utils/logger.js';
import { closeAllWebSocketConnections } from './websocket.js';
import { TerminalServer } from '../types/index.js';

let isShuttingDown = false;

export function createGracefulShutdown(
    wss: WebSocketServer,
    httpServer: Server,
    terminalServer: TerminalServer | undefined,
    cleanup: (() => Promise<void>) | undefined
) {
    return async function gracefulShutdown(signal: string): Promise<void> {
        if (isShuttingDown) {
            broadcastLog('info', 'Shutdown already in progress...');
            return;
        }
        
        isShuttingDown = true;
        broadcastLog('info', `\nReceived ${signal} signal`);
        
        try {
            // Set a timeout for the entire shutdown process
            const shutdownTimeout = setTimeout(() => {
                broadcastLog('error', 'Shutdown timed out, forcing exit');
                process.exit(1);
            }, 3000);

            // Close all WebSocket connections
            closeAllWebSocketConnections();
            
            // Close the WebSocket server
            wss.close();
            
            // Cleanup terminal server if it exists
            if (terminalServer?.cleanup) {
                terminalServer.cleanup();
            }
            
            // Cleanup MCP servers if they were initialized
            if (cleanup) {
                try {
                    await Promise.race([
                        cleanup(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('MCP cleanup timeout')), 1000))
                    ]);
                } catch (error) {
                    broadcastLog('error', `MCP cleanup error: ${error}`);
                }
            }
            
            // Close the HTTP server
            httpServer.close();
            
            // Clear the timeout and exit
            clearTimeout(shutdownTimeout);
            process.exit(0);
        } catch (error) {
            broadcastLog('error', `Error during shutdown: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    };
} 