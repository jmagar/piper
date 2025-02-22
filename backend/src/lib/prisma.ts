import { PrismaClient } from '@prisma/client';

/**
 * Global Prisma Client instance to be used across the application
 * This ensures we don't create multiple instances of PrismaClient
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Initialize Prisma Client with logging in development
 */
export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma; 