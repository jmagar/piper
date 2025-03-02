import type { PrismaClient } from '@prisma/client';
import { ChatLangChainService } from './chat-langchain.service.mjs';
import type { ChatMessage } from '../../types/chat.mjs';
import debug from 'debug';

const log = debug('mcp:chat');
const error = debug('mcp:chat:error');

/**
 * @deprecated Use ChatLangChainService directly instead
 * This is a wrapper around ChatLangChainService to maintain compatibility
 * with existing code that depends on ChatService
 */
export class ChatService {
  private langchainService: ChatLangChainService;

  constructor(prisma: PrismaClient) {
    log('Creating ChatService (wrapper around ChatLangChainService)');
    this.langchainService = new ChatLangChainService(prisma);
  }

  /**
   * Process a message
   * @deprecated Use ChatLangChainService.processMessage directly
   * @param message User message
   * @param userId User ID
   * @returns Processed chat message
   */
  async processMessage(message: string, userId: string): Promise<ChatMessage> {
    log('Using ChatLangChainService.processMessage via wrapper');
    return this.langchainService.processMessage(message, userId);
  }

  /**
   * Clean up resources
   * @deprecated Use ChatLangChainService.cleanupResources directly
   */
  async cleanupResources() {
    log('Using ChatLangChainService.cleanupResources via wrapper');
    return this.langchainService.cleanupResources();
  }
}