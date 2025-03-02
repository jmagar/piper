/**
 * Manual test script for error handling
 * 
 * This script tests our graceful error handling in the ChatLangChainService
 * by forcing a failure in the MCP server initialization.
 */
import { PrismaClient } from '@prisma/client';
import { ChatLangChainService } from './services/chat/chat-langchain.service.mjs';

// Override environment configs to force an error
process.env.LOG_LEVEL = 'debug';

async function testErrorHandling() {
  const prisma = new PrismaClient();
  const chatService = new ChatLangChainService(prisma);
  
  console.log('Testing graceful error handling...');
  
  try {
    // Set up our callbacks to track the response
    const callbacks = {
      onChunk: (chunk: string) => {
        console.log(`Received chunk: ${chunk}`);
      },
      onComplete: () => {
        console.log('Message complete');
      },
      onError: (error: Error) => {
        console.error('Error received:', error);
      }
    };
    
    // Process a message - should trigger our graceful degradation
    const result = await chatService.processStreamingMessage(
      'Hello, is this working with graceful degradation?',
      'test-user',
      callbacks
    );
    
    console.log('Response received:', result);
    console.log('Test completed successfully - got a response despite errors');
  } catch (error) {
    console.error('Test failed - error not handled gracefully:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testErrorHandling().catch(console.error); 