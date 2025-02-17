import { PrismaClient, Prisma } from '@prisma/client';
import { broadcastLog } from '../utils/logger.js';
import { EventEmitter } from 'events';

// Define the event emitter interface
interface PrismaEventEmitter extends EventEmitter {
    $on(event: 'query', listener: (event: Prisma.QueryEvent) => void): void;
    $on(event: 'error' | 'info' | 'warn', listener: (event: Prisma.LogEvent) => void): void;
}

class Database {
    private static instance: PrismaClient | null = null;
    private constructor() {}

    public static getInstance(): PrismaClient {
        if (!Database.instance) {
            Database.instance = new PrismaClient({
                log: [
                    { level: 'query', emit: 'event' },
                    { level: 'error', emit: 'event' },
                    { level: 'info', emit: 'event' },
                    { level: 'warn', emit: 'event' },
                ],
            });

            // Log all database events
            const emitter = Database.instance as unknown as PrismaEventEmitter;
            
            emitter.$on('query', (e) => {
                broadcastLog('debug', `Query: ${e.query}`);
            });

            emitter.$on('error', (e) => {
                broadcastLog('error', `Database error: ${e.message}`);
            });

            emitter.$on('info', (e) => {
                broadcastLog('info', `Database info: ${e.message}`);
            });

            emitter.$on('warn', (e) => {
                broadcastLog('info', `Database warning: ${e.message}`);
            });

            broadcastLog('info', 'Database connection initialized');
        }
        return Database.instance;
    }

    public static async cleanup(): Promise<void> {
        if (Database.instance) {
            await Database.instance.$disconnect();
            Database.instance = null;
            broadcastLog('info', 'Database connection closed');
        }
    }
}

export const prisma = Database.getInstance();
export const cleanupDatabase = Database.cleanup; 