import { createClient } from 'redis';
import { broadcastLog } from '../utils/logger.js';

async function testRedisConnection() {
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:7654';
    
    try {
        broadcastLog('info', '=== Testing Redis Connection ===');
        
        // Create Redis client
        const client = createClient({
            url: REDIS_URL,
            socket: {
                reconnectStrategy: (retries: number) => {
                    const delay = Math.min(retries * 50, 2000);
                    broadcastLog('info', `Retrying Redis connection in ${delay}ms...`);
                    return delay;
                }
            }
        });

        // Set up event handlers
        client.on('connect', () => broadcastLog('info', 'Successfully connected to Redis'));
        client.on('error', (err) => broadcastLog('error', `Redis Error: ${err.message}`));
        client.on('reconnecting', () => broadcastLog('info', 'Reconnecting to Redis...'));
        client.on('end', () => broadcastLog('info', 'Redis connection ended'));

        // Connect to Redis
        broadcastLog('info', 'Connecting to Redis...');
        await client.connect();

        // Test basic operations
        broadcastLog('info', '=== Testing Basic Operations ===');
        
        // Test SET operation
        broadcastLog('info', 'Testing SET operation...');
        await client.set('test:key', 'Hello Redis!');
        broadcastLog('info', 'SET operation successful');

        // Test GET operation
        broadcastLog('info', 'Testing GET operation...');
        const value = await client.get('test:key');
        broadcastLog('info', `GET operation result: ${value}`);

        // Test expiration
        broadcastLog('info', 'Testing expiration...');
        await client.set('test:expiring', 'This will expire', { EX: 5 });
        broadcastLog('info', 'Expiration set successfully');

        // Test existence
        const exists = await client.exists('test:key');
        broadcastLog('info', `Key existence check: ${exists}`);

        // Clean up
        broadcastLog('info', 'Cleaning up test keys...');
        await client.del('test:key');
        await client.del('test:expiring');

        // Disconnect
        broadcastLog('info', 'Disconnecting from Redis...');
        await client.quit();
        broadcastLog('info', '=== Redis Test Complete ===');
        
        return true;
    } catch (error) {
        broadcastLog('error', `Redis Test Failed: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

// Run the test
testRedisConnection().then(success => {
    if (!success) {
        process.exit(1);
    }
}); 