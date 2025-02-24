import { PrismaClient } from '@prisma/client';
import debug from 'debug';

import { createLangGraph } from '../../langgraph/index.js';
import type { ChatMessage, ChatMetadata, MessageType } from '../../types/chat.mjs';
import { createMetadata } from '../../types/chat.mjs';

const log = debug('mcp:chat:langchain');
const error = debug('mcp:chat:langchain:error');

export class ChatLangChainService {
  private agent: Awaited<ReturnType<typeof createLangGraph>> | null = null;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private async initAgent() {
    if (!this.agent) {
      try {
        log('Initializing LangGraph agent...');
        this.agent = await createLangGraph();
        log('LangGraph agent initialized successfully');
      } catch (err) {
        error('Failed to initialize LangGraph agent: %s', err instanceof Error ? err.message : String(err));
        return null;
      }
    }
    return this.agent;
  }

  async processMessage(message: string, userId: string, conversationId?: string): Promise<ChatMessage> {
    try {
      log('Processing message from user %s: %s', userId, message);

      // Create or find user
      const user = await this.prisma.user.upsert({
        where: { id: userId },
        create: {
          id: userId,
          email: `${userId}@example.com`, // Placeholder email
          name: userId
        },
        update: {}
      });

      // Get or create conversation
      let conversation;
      if (conversationId) {
        conversation = await this.prisma.conversation.findUnique({
          where: { id: conversationId }
        });
      }
      
      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: {
            user_id: user.id,
            title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
            last_message_at: new Date()
          }
        });
      } else {
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: { last_message_at: new Date() }
        });
      }

      // Store user message
      const userMessage = await this.prisma.chatMessage.create({
        data: {
          content: message,
          role: 'user',
          conversation_id: conversation.id,
          user_id: user.id,
          metadata: createMetadata({
            timestamp: new Date().toISOString(),
            type: 'text'
          })
        }
      });

      // Try to get agent response, fallback to echo if agent fails
      let response: string;
      let messageType: MessageType = 'text';
      let metadataObj: ChatMetadata = {
        timestamp: new Date().toISOString()
      };
      
      try {
        const agent = await this.initAgent();
        if (agent) {
          log('Querying LangGraph agent...');
          response = await agent.invoke(message, conversation.id);
          
          // Add metadata for special responses
          if (message.toLowerCase().includes('list') && message.toLowerCase().includes('file')) {
            messageType = 'file-list';
            metadataObj = {
              ...metadataObj,
              type: 'file-list'
            };
          }
          log('Got response from LangGraph agent, length: %d', response.length);
        } else {
          error('Agent not available');
          response = "I'm currently experiencing some technical difficulties with my tools. I can still chat, but some advanced features might not be available.";
          messageType = 'system';
          metadataObj = {
            ...metadataObj,
            type: 'system',
            error: 'agent_unavailable'
          };
        }
      } catch (err) {
        error('Error getting agent response: %s', err instanceof Error ? err.message : String(err));
        response = "I'm currently experiencing some technical difficulties. Please try again in a moment.";
        messageType = 'system';
        metadataObj = {
          ...metadataObj,
          type: 'system',
          error: 'agent_error',
          errorMessage: err instanceof Error ? err.message : 'Unknown error'
        };
      }

      // Store assistant response
      const assistantMessage = await this.prisma.chatMessage.create({
        data: {
          content: response,
          role: 'assistant',
          conversation_id: conversation.id,
          user_id: user.id,
          parent_id: userMessage.id,
          metadata: createMetadata(metadataObj)
        }
      });

      // Create response object
      const result: ChatMessage = {
        id: assistantMessage.id,
        content: response,
        role: 'assistant',
        userId: assistantMessage.user_id ?? '',
        username: user.name ?? '',
        conversationId: conversation.id,
        parentId: assistantMessage.parent_id ?? undefined,
        type: messageType,
        metadata: createMetadata(metadataObj),
        createdAt: assistantMessage.created_at,
        updatedAt: assistantMessage.updated_at
      };

      log('Message processed successfully');
      return result;
    } catch (err) {
      error('Error processing message: %s', err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  async cleanupResources() {
    if (this.agent) {
      try {
        log('Cleaning up agent resources...');
        await this.agent.cleanupResources();
        this.agent = null;
        log('Agent resources cleaned up successfully');
      } catch (err) {
        error('Error cleaning up agent: %s', err instanceof Error ? err.message : String(err));
      }
    }
  }
}