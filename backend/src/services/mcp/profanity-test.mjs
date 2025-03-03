#!/usr/bin/env node
/**
 * Test script for the profanity analysis feature in the Analytics MCP Server
 * 
 * This script demonstrates how to call the profanity analysis features
 * directly without going through the MCP protocol.
 */

import { AnalyticsMcpServer } from './analytics-mcp-server.js';
import * as debugModule from 'debug';

// Enable debug logging
const debug = debugModule.default;
debug.enable('mcp:*');

const log = debug('mcp:profanity-test');

/**
 * Run the profanity analysis tests
 */
async function runProfanityTests() {
  log('Starting profanity analysis tests');
  
  try {
    // Create an instance of the analytics server
    const server = new AnalyticsMcpServer();
    
    // Sample text with profanity for testing
    const sampleTexts = [
      "This is a clean message with no issues.",
      "What the hell is going on with this service?",
      "The damn system is not working properly!",
      "This is so fucking annoying, I can't believe it.",
      "I'm tired of this bullshit excuse every time.",
      "Shit, I forgot to include the attachment."
    ];
    
    log('Testing profanity detection in sample texts:');
    for (const text of sampleTexts) {
      const profanityFound = server._countProfanity(text);
      if (profanityFound.length > 0) {
        log('✓ Detected %d cuss words in: "%s"', profanityFound.length, text);
        for (const p of profanityFound) {
          log('  - Found "%s" at position %d: "%s"', p.word, p.index, p.context);
        }
      } else {
        log('✓ No profanity detected in: "%s"', text);
      }
    }
    
    // Test the conversation summary with profanity data
    log('\nFetching a conversation summary with profanity analysis:');
    
    // Get the first conversation ID from the database
    const firstConversation = await server.prisma.conversation.findFirst({
      select: { id: true }
    });
    
    if (firstConversation) {
      const conversationId = firstConversation.id;
      log('Using conversation ID: %s', conversationId);
      
      const summary = await server.getConversationSummary(conversationId);
      
      if (summary && summary.content && summary.content[0] && summary.content[0].text) {
        const result = summary.content[0].text;
        
        log('Conversation Summary:');
        log('- Title: %s', result.title);
        log('- Message Count: %d', result.messageCount);
        
        if (result.profanity) {
          log('- Profanity Analysis:');
          log('  - Total Cuss Words: %d', result.profanity.totalCussWords);
          log('  - Messages With Profanity: %d', result.profanity.messagesWithProfanity);
          log('  - Percentage With Profanity: %s', result.profanity.percentWithProfanity);
          
          if (result.profanity.topCussWords && result.profanity.topCussWords.length > 0) {
            log('  - Top Cuss Words:');
            for (const word of result.profanity.topCussWords) {
              log('    - "%s": %d occurrences', word.word, word.count);
            }
          } else {
            log('  - No cuss words found in conversation');
          }
        } else {
          log('- No profanity data available');
        }
      } else {
        log('Failed to get conversation summary or no content returned');
      }
    } else {
      log('No conversations found in the database');
    }
    
    // Test the full profanity analysis
    log('\nTesting full profanity analysis:');
    const analysis = await server.getProfanityAnalysis(null, null, 30);
    
    if (analysis && analysis.content && analysis.content[0] && analysis.content[0].text) {
      const result = analysis.content[0].text;
      
      log('Profanity Analysis Results:');
      log('- Period: %s', result.period);
      log('- Summary:');
      log('  - Total Messages Analyzed: %d', result.summary.totalMessagesAnalyzed);
      log('  - Total Profanity Count: %d', result.summary.totalProfanityCount);
      log('  - Unique Words Used: %d', result.summary.uniqueWordsUsed);
      log('  - Percent Messages With Profanity: %s', result.summary.percentMessagesWithProfanity);
      
      if (result.topProfanityRanking && result.topProfanityRanking.length > 0) {
        log('- Top Cuss Words:');
        for (const word of result.topProfanityRanking.slice(0, 5)) {
          log('  - "%s": %d occurrences', word.word, word.count);
        }
      } else {
        log('- No cuss words found in analysis');
      }
      
      if (result.userRanking && result.userRanking.length > 0) {
        log('- Top Users by Profanity:');
        for (const user of result.userRanking.slice(0, 3)) {
          log('  - %s: %d occurrences', user.name, user.count);
        }
      }
    } else {
      log('Failed to get profanity analysis or no content returned');
    }
    
    log('\nTests completed successfully');
    
    // Clean up
    await server.cleanup();
    
  } catch (err) {
    log('Error in tests: %s', err.message);
    console.error('Test error:', err);
  }
}

// Run the tests
runProfanityTests()
  .then(() => log('All tests completed'))
  .catch(err => {
    console.error('Tests failed:', err);
    process.exit(1);
  });