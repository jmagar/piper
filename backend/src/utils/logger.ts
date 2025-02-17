import { WebSocket } from 'ws';
import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Create a write stream for the log file
const logStream = fs.createWriteStream(
    path.join(logsDir, `server-${format(new Date(), 'yyyy-MM-dd')}.log`),
    { flags: 'a' }
);

// Create a custom logger that broadcasts to WebSocket clients
const logClients = new Set<WebSocket>();

function formatTimestamp(date: Date): string {
    return format(date, 'yyyy-MM-dd HH:mm:ss.SSS');
}

function writeToFile(logEntry: { timestamp: string; level: LogLevel; message: string }): void {
    const logLine = `${logEntry.timestamp} [${logEntry.level.toUpperCase()}] ${logEntry.message}\n`;
    logStream.write(logLine);
}

export function broadcastLog(level: LogLevel, message: string): void {
    const timestamp = formatTimestamp(new Date());
    const logEntry = {
        timestamp,
        level,
        message
    };
    
    // Write to file
    writeToFile(logEntry);
    
    // Format console message
    const formattedMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    // Log to console with appropriate method
    switch (level) {
        case 'error':
            console.error(formattedMessage);
            break;
        case 'warn':
            console.warn(formattedMessage);
            break;
        case 'debug':
            console.debug(formattedMessage);
            break;
        case 'info':
            console.log(formattedMessage);
            break;
    }
    
    // Broadcast to WebSocket clients
    logClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(logEntry));
        }
    });
}

export function addLogClient(client: WebSocket): void {
    logClients.add(client);
}

export function removeLogClient(client: WebSocket): void {
    logClients.delete(client);
}

export function clearLogClients(): void {
    logClients.clear();
}

export function terminateAllClients(): void {
    logClients.forEach(client => client.terminate());
    clearLogClients();
}

// Clean up function for the logger
export function cleanupLogger(): void {
    logStream.end();
    terminateAllClients();
} 