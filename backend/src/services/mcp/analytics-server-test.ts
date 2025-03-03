import { PrismaClient } from '@prisma/client';
import debug from 'debug';

const log = debug('mcp:analytics-test');

/**
 * Simple analytics tester
 */
export async function testAnalyticsQueries(): Promise<void> {
  log('Initializing analytics test...');
  const prisma = new PrismaClient();
  
  try {
    // Test conversation summary query
    log('Testing conversation summary query...');
    const conversations = await prisma.conversation.findMany({
      take: 1,
      include: {
        messages: true,
        stats: true,
      }
    });
    
    if (conversations.length > 0) {
      const conversation = conversations[0];
      
      // Get basic stats
      const messageCount = conversation.messages.length;
      const userMessages = conversation.messages.filter(m => m.role === 'user').length;
      const assistantMessages = conversation.messages.filter(m => m.role === 'assistant').length;
      
      // Get word counts
      const totalWords = conversation.messages.reduce((sum, message) => {
        return sum + (message.content.match(/\S+/g) || []).length;
      }, 0);
      
      const averageWordsPerMessage = messageCount > 0 ? totalWords / messageCount : 0;
      
      // Log the result
      log('Conversation summary results:');
      log('- ID: %s', conversation.id);
      log('- Title: %s', conversation.title || 'Untitled');
      log('- Message count: %d', messageCount);
      log('- User messages: %d', userMessages);
      log('- Assistant messages: %d', assistantMessages);
      log('- Total words: %d', totalWords);
      log('- Average words per message: %d', Math.round(averageWordsPerMessage));
      log('- Is archived: %s', conversation.is_archived ? 'Yes' : 'No');
    } else {
      log('No conversations found in the database');
    }
    
    // Test user activity query
    log('Testing user activity query...');
    const users = await prisma.user.findMany({
      take: 2,
      include: {
        usage_stats: true,
        messages: {
          take: 5,
          orderBy: {
            created_at: 'desc'
          }
        }
      }
    });
    
    if (users.length > 0) {
      log('Found %d users', users.length);
      
      for (const user of users) {
        log('User: %s', user.name || user.email || user.id);
        log('- Message count: %d', user.messages.length);
        log('- Usage stats: %s', user.usage_stats ? 'Available' : 'Not available');
        
        if (user.usage_stats) {
          log('  - Total conversations: %d', user.usage_stats.total_conversations);
          log('  - Total messages: %d', user.usage_stats.total_messages);
          log('  - Last active: %s', user.usage_stats.last_active.toISOString());
        }
      }
    } else {
      log('No users found in the database');
    }
    
    // Test system overview query
    log('Testing system overview query...');
    const userCount = await prisma.user.count();
    const conversationCount = await prisma.conversation.count();
    const messageCount = await prisma.chatMessage.count();
    
    log('System overview:');
    log('- Total users: %d', userCount);
    log('- Total conversations: %d', conversationCount);
    log('- Total messages: %d', messageCount);
    log('- Active conversations: %d', 
      await prisma.conversation.count({
        where: {
          is_archived: false
        }
      })
    );
    
    log('Analytics test completed successfully');
  } catch (error) {
    log('Error in analytics test: %s', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      log('Error stack: %s', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// If this file is run directly, execute the test
if (require.main === module) {
  debug.enable('mcp:*');
  testAnalyticsQueries().catch(console.error);
}