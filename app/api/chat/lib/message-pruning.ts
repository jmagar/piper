import { Message as MessageAISDK } from 'ai';
import { appLogger } from '@/lib/logger';
import { getCurrentCorrelationId } from '@/lib/logger/correlation';
import { countTokens, countMessagesTokens } from './token-management';

// =============================================================================
// CONFIGURATION
// =============================================================================

const PRUNING_CONFIG = {
  MAX_MESSAGE_COUNT_THRESHOLD: 50,
} as const;

// =============================================================================
// MESSAGE PRUNING
// =============================================================================

/**
 * Prune messages based on token limits while preserving system messages
 */
export function pruneMessagesForPayloadSize(
  initialMessages: MessageAISDK[], 
  dynamicPruningLimit: number, 
  correlationId?: string
): MessageAISDK[] {
  const definiteCorrelationId = correlationId || getCurrentCorrelationId();
  const initialTokenCount = countMessagesTokens(initialMessages);
  const initialMessageCount = initialMessages.length;
  const systemMessagesCount = initialMessages.filter(msg => msg.role === 'system').length;
  const nonSystemMessagesCount = initialMessageCount - systemMessagesCount;

  appLogger.info(
    `[pruneMessages] Before pruning: ${initialMessageCount} messages (${systemMessagesCount} system, ${nonSystemMessagesCount} non-system), ~${initialTokenCount} tokens. Target limit: ${dynamicPruningLimit} tokens.`, 
    { correlationId: definiteCorrelationId, initialMessageCount, systemMessagesCount, nonSystemMessagesCount, initialTokenCount, limit: dynamicPruningLimit }
  );

  if (initialTokenCount <= dynamicPruningLimit && initialMessageCount <= PRUNING_CONFIG.MAX_MESSAGE_COUNT_THRESHOLD) {
    appLogger.info(`[pruneMessages] No pruning needed. Token count (${initialTokenCount}) is within limit (${dynamicPruningLimit}).`, { correlationId: definiteCorrelationId });
    return initialMessages;
  }

  const systemMessages = initialMessages.filter(msg => msg.role === 'system');
  const nonSystemMessages = initialMessages.filter(msg => msg.role !== 'system');

  let currentTokenCount = countMessagesTokens(systemMessages);
  const prunedNonSystemMessages: MessageAISDK[] = [];

  // Iterate from most recent non-system messages backwards
  for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
    const message = nonSystemMessages[i];
    const messageTokens = countTokens(message);

    if (currentTokenCount + messageTokens <= dynamicPruningLimit) {
      prunedNonSystemMessages.unshift(message); // Add to the beginning to maintain order
      currentTokenCount += messageTokens;
    } else {
      appLogger.info(
        `[pruneMessages] Token limit reached while adding older messages. Pruning ${i + 1} older non-system messages. Current tokens: ${currentTokenCount}`, 
        { correlationId: definiteCorrelationId, prunedCount: i + 1, currentTokenCount }
      );
      break; 
    }
  }
  
  // Combine system messages (always included) with the pruned non-system messages
  const finalMessages = [...systemMessages, ...prunedNonSystemMessages];
  const finalTokenCount = currentTokenCount;

  appLogger.info(
    `[pruneMessages] After pruning: ${finalMessages.length} messages, ~${finalTokenCount} tokens. Removed: ${initialMessageCount - finalMessages.length} messages.`, 
    { correlationId: definiteCorrelationId, finalMessageCount: finalMessages.length, finalTokenCount, removedCount: initialMessageCount - finalMessages.length }
  );

  return finalMessages;
}