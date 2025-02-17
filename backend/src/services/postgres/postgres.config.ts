import { Prisma } from '@prisma/client';
import { broadcastLog } from '../../utils/logger.js';

// Database URL from environment variables
export const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://pooper:pooperdev@localhost:7432/pooper';

// Prisma Client Configuration
export const PRISMA_CLIENT_CONFIG: Prisma.PrismaClientOptions = {
    log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
    ],
    errorFormat: 'pretty',
};

// Event Handlers Configuration
export const DATABASE_EVENTS = {
    query: (e: Prisma.QueryEvent) => {
        broadcastLog('debug', `Query: ${e.query}`);
        if (e.duration >= 500) { // Log slow queries (>500ms)
            broadcastLog('warn', `Slow query detected (${e.duration}ms): ${e.query}`);
        }
    },
    error: (e: Prisma.LogEvent) => {
        broadcastLog('error', `Database error: ${e.message}`);
    },
    info: (e: Prisma.LogEvent) => {
        broadcastLog('info', `Database info: ${e.message}`);
    },
    warn: (e: Prisma.LogEvent) => {
        broadcastLog('info', `Database warning: ${e.message}`);
    },
};

// Connection Pool Configuration
export const POOL_CONFIG = {
    max: 20, // Maximum number of connections
    idleTimeoutMillis: 30000, // How long a connection can be idle before being closed
    connectionTimeoutMillis: 2000, // How long to wait for a connection
    maxUses: 7500, // Maximum number of times a connection can be used
}; 