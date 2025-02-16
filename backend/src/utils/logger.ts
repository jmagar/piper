import { WebSocket } from 'ws';
import { format } from 'date-fns';
import { LogLevel } from '../types/index.js';
import fs from 'fs';
import path from 'path';

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
    return `[${format(date, 'yyyy/MM/dd')}][${format(date, 'hh:mm:ss aa')} EST]`;
}

function writeToFile(logEntry: { timestamp: string; level: LogLevel; message: string }) {
    const logLine = `${logEntry.timestamp} [${logEntry.level.toUpperCase()}] ${logEntry.message}\n`;
    logStream.write(logLine);
}

export function broadcastLog(level: LogLevel, message: string) {
    const logEntry = {
        timestamp: formatTimestamp(new Date()),
        level,
        message
    };
    
    // Write to file
    writeToFile(logEntry);
    
    // Broadcast to WebSocket clients
    logClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(logEntry));
        }
    });
    
    // Also log to console with the same timestamp format
    const logMessage = `${logEntry.timestamp} [${level.toUpperCase()}] ${message}`;
    if (level === 'error') {
        console.error(logMessage);
    } else {
        console.log(logMessage);
    }
}

export function addLogClient(client: WebSocket) {
    logClients.add(client);
}

export function removeLogClient(client: WebSocket) {
    logClients.delete(client);
}

export function clearLogClients() {
    logClients.clear();
}

export function terminateAllClients() {
    logClients.forEach(client => client.terminate());
    clearLogClients();
}

// Clean up function for the logger
export function cleanupLogger() {
    logStream.end();
    terminateAllClients();
} 