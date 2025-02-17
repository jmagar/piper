import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { prisma } from './lib/prisma.js';
import { RedisManager } from './services/redis/redis.service.js';
import { broadcastLog } from './utils/logger.js';

// Load environment variables from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../.env') });

async function testPostgres() {
    try {
        broadcastLog('info', '=== Testing PostgreSQL Connection ===');
        
        // Test basic connection
        const result = await prisma.$queryRaw`SELECT 1 as alive`;
        broadcastLog('info', `Database connection successful: ${JSON.stringify(result)}`);

        // Test conversation creation
        const conversation = await prisma.conversation.create({
            data: {
                title: 'Test Conversation',
                messages: {
                    create: [
                        {
                            role: 'user',
                            content: 'Test message',
                            metadata: { test: true }
                        }
                    ]
                }
            },
            include: {
                messages: true
            }
        });
        broadcastLog('info', `Created test conversation: ${conversation.id}`);
        broadcastLog('info', `Created message: ${conversation.messages[0].content}`);

        // Verify message persistence by reading it back
        const savedMessages = await prisma.chatMessage.findMany({
            where: { conversation_id: conversation.id }
        });
        broadcastLog('info', `Retrieved ${savedMessages.length} messages from database`);
        broadcastLog('info', `Verified message content: ${savedMessages[0].content}`);
        broadcastLog('info', `Message metadata: ${JSON.stringify(savedMessages[0].metadata)}`);

        // Clean up - first delete messages, then conversation
        await prisma.chatMessage.deleteMany({
            where: { conversation_id: conversation.id }
        });
        await prisma.conversation.delete({
            where: { id: conversation.id }
        });
        broadcastLog('info', 'Test data cleaned up');
        
        return true;
    } catch (error) {
        broadcastLog('error', `PostgreSQL Test Failed: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

async function testRedis() {
    try {
        broadcastLog('info', '=== Testing Redis Connection ===');
        
        // Get Redis client
        const redis = await RedisManager.getInstance();
        
        // Test basic operations
        const testKey = 'test:connection';
        await redis.set(testKey, 'Hello Redis!');
        const value = await redis.get(testKey);
        broadcastLog('info', `Redis SET/GET successful: ${value}`);

        // Test expiration
        await redis.set('test:expiring', 'This will expire', { EX: 1 });
        const expiringValue = await redis.get('test:expiring');
        broadcastLog('info', `Expiring value set: ${expiringValue}`);
        
        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 1500));
        const expiredValue = await redis.get('test:expiring');
        broadcastLog('info', `Value after expiration: ${expiredValue === null ? 'null (as expected)' : expiredValue}`);

        // Test complex data
        const complexData = {
            id: 1,
            name: 'Test',
            timestamp: new Date().toISOString()
        };
        await redis.set('test:complex', JSON.stringify(complexData));
        const retrievedData = JSON.parse(await redis.get('test:complex') || '{}');
        broadcastLog('info', `Complex data test successful: ${JSON.stringify(retrievedData)}`);

        // Clean up
        await redis.del('test:connection');
        await redis.del('test:complex');
        broadcastLog('info', 'Test data cleaned up');

        return true;
    } catch (error) {
        broadcastLog('error', `Redis Test Failed: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

async function runStorageTests() {
    try {
        broadcastLog('info', '=== Starting Storage Tests ===');
        
        const postgresResult = await testPostgres();
        broadcastLog('info', `PostgreSQL Tests: ${postgresResult ? 'PASSED' : 'FAILED'}`);
        
        const redisResult = await testRedis();
        broadcastLog('info', `Redis Tests: ${redisResult ? 'PASSED' : 'FAILED'}`);
        
        broadcastLog('info', '=== Storage Tests Complete ===');
        
        // Cleanup
        await prisma.$disconnect();
        await RedisManager.cleanup();
        
        return postgresResult && redisResult;
    } catch (error) {
        broadcastLog('error', `Test Suite Failed: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

// Run the tests
runStorageTests().then(success => {
    if (!success) {
        process.exit(1);
    }
    process.exit(0);
}); 