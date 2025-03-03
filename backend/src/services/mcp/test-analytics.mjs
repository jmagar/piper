// ES Module test script for analytics functionality
import { PrismaClient } from '@prisma/client';
import * as debugModule from 'debug';
import { fileURLToPath } from 'url';

const debug = debugModule.default;
const log = debug('mcp:analytics-test');

/**
 * Run a simple test of the analytics queries
 */
async function testAnalytics() {
  debug.enable('mcp:*');
  log('Starting analytics test...');
  const prisma = new PrismaClient();
  
  try {
    // Get conversation count
    const conversationCount = await prisma.conversation.count();
    log('Total conversations: %d', conversationCount);
    
    // Get a sample conversation if any exist
    if (conversationCount > 0) {
      const conversation = await prisma.conversation.findFirst({
        include: {
          messages: true,
          stats: true,
        }
      });
      
      if (conversation) {
        log('Sample conversation:');
        log('- ID: %s', conversation.id);
        log('- Title: %s', conversation.title || 'Untitled');
        log('- Message count: %d', conversation.messages.length);
        log('- Is archived: %s', conversation.is_archived ? 'Yes' : 'No');
      }
    }
    
    // Get user count
    const userCount = await prisma.user.count();
    log('Total users: %d', userCount);
    
    // Get message count
    const messageCount = await prisma.chatMessage.count();
    log('Total messages: %d', messageCount);
    
    log('Analytics test completed successfully');
  } catch (error) {
    log('Error in test: %s', error.message);
    console.error('Test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check if this file is being run directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

// Run test if executed directly
if (isMainModule) {
  testAnalytics()
    .then(() => log('Test completed'))
    .catch(err => console.error('Test failed:', err));
}

export { testAnalytics };