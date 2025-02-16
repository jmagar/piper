import { Server as HttpServer } from 'http';
import { WebSocketServer } from 'ws';
import { TerminalServer } from '../types/index.js';
import { broadcastLog, terminateAllClients } from './logger.js';

let isShuttingDown = false;

export async function gracefulShutdown(
    signal: string,
    {
        httpServer,
        wss,
        terminalServer,
        cleanup
    }: {
        httpServer: HttpServer;
        wss: WebSocketServer;
        terminalServer?: TerminalServer;
        cleanup?: () => Promise<void>;
    }
): Promise<void> {
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

        // Close all WebSocket connections immediately
        terminateAllClients();
        
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
        
        // Close the HTTP server immediately
        httpServer.close();
        
        // Clear the timeout and exit
        clearTimeout(shutdownTimeout);
        process.exit(0);
    } catch (error) {
        broadcastLog('error', `Error during shutdown: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

export function setupShutdownHandlers(params: Parameters<typeof gracefulShutdown>[1]) {
    process.on('SIGINT', () => void gracefulShutdown('SIGINT', params));
    process.on('SIGTERM', () => void gracefulShutdown('SIGTERM', params));
    process.on('unhandledRejection', (reason) => {
        broadcastLog('error', `Unhandled Promise rejection: ${reason}`);
        if (!isShuttingDown) {
            void gracefulShutdown('UNHANDLED_REJECTION', params);
        }
    });
} 