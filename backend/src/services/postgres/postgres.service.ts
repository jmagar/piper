import { PrismaClient, Prisma } from '@prisma/client';
import { broadcastLog } from '../../utils/logger.js';
import { PRISMA_CLIENT_CONFIG, DATABASE_EVENTS } from './postgres.config.js';

interface PrismaEventEmitter {
    $on(event: 'query', listener: (event: Prisma.QueryEvent) => void): void;
    $on(event: 'error' | 'info' | 'warn', listener: (event: Prisma.LogEvent) => void): void;
}

class DatabaseManager {
    private static instance: PrismaClient | null = null;
    private constructor() {}

    public static getInstance(): PrismaClient {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new PrismaClient(PRISMA_CLIENT_CONFIG);

            // Set up event handlers
            const client = DatabaseManager.instance as unknown as PrismaEventEmitter;
            client.$on('query', DATABASE_EVENTS.query);
            client.$on('error', DATABASE_EVENTS.error);
            client.$on('info', DATABASE_EVENTS.info);
            client.$on('warn', DATABASE_EVENTS.warn);

            broadcastLog('info', 'Database connection initialized');
        }

        return DatabaseManager.instance;
    }

    public static async cleanup(): Promise<void> {
        if (DatabaseManager.instance) {
            await DatabaseManager.instance.$disconnect();
            DatabaseManager.instance = null;
            broadcastLog('info', 'Database connection closed');
        }
    }
}

// Initialize and export Prisma client
export const prisma = DatabaseManager.getInstance();

// Export cleanup function
export const cleanupDatabase = DatabaseManager.cleanup; 