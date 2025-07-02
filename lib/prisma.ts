"server-only"; // Ensures this module (and thus PrismaClient) only runs on the server

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Enhanced PrismaClient configuration with connection pooling and monitoring
const createPrismaClient = () => {
  const env = (globalThis as any).process?.env || {}
  
  return new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
    // Connection pooling configuration
    // Note: These are handled by the connection string in most cases
    // but can be configured here for specific deployments
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Graceful shutdown handling
const gracefulShutdown = async () => {
  console.log('Shutting down Prisma client...')
  await prisma.$disconnect()
}

// Only set up shutdown handlers in Node.js environment
const nodeProcess = (globalThis as any).process
if (nodeProcess && typeof nodeProcess.on === 'function') {
  nodeProcess.on('SIGINT', gracefulShutdown)
  nodeProcess.on('SIGTERM', gracefulShutdown)
  nodeProcess.on('beforeExit', gracefulShutdown)
}

if ((globalThis as any).process?.env?.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Export utility functions for monitoring
export const getPrismaMetrics = async () => {
  try {
    // Get database metrics if available
    const result = await prisma.$queryRaw`SELECT 1 as connected`
    return { 
      connected: Array.isArray(result) && result.length > 0,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }
  }
}

export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection test failed:', error)
    return false
  }
} 