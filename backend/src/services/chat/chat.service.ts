import type { PrismaClient } from '@prisma/client';

import { createLangGraph } from '../../langgraph/index.js';

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  userId: string;
  username: string;
  conversationId?: string;
  parentId?: string;
  type?: 'text' | 'code' | 'system';
  metadata?: { [key: string]: unknown };
  createdAt: Date;
  updatedAt?: Date;
}

export class ChatService {
  private agent: Awaited<ReturnType<typeof createLangGraph>> | null = null;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private async initAgent() {
    if (!this.agent) {
      try {
        this.agent = await createLangGraph();
      } catch (error) {
        console.error('Failed to initialize LangGraph agent:', error);
        // Continue without the agent
        return null;
      }
    }
    return this.agent;
  }

  private formatToolResponse(response: string): string {
    try {
      // Try to parse as JSON first
      const data = JSON.parse(response);
      
      // Handle file listing response
      if (Array.isArray(data) && data.every(item => typeof item === 'object' && 'name' in item)) {
        const fileList = data
          .map(file => `${file.type === 'directory' ? '📁' : '📄'} ${file.name}`)
          .join('\n');
        return `Directory contents:\n\n${fileList}`;
      }
      
      // For other JSON responses, pretty print
      return JSON.stringify(data, null, 2);
    } catch {
      // If not JSON, return as is
      return response;
    }
  }

  async processMessage(message: string, userId: string): Promise<ChatMessage> {
    try {
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

      // Create conversation
      const conversation = await this.prisma.conversation.create({
        data: {
          user_id: user.id,
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          last_message_at: new Date()
        }
      });

      // Store user message
      const userMessage = await this.prisma.chatMessage.create({
        data: {
          content: message,
          role: 'user',
          conversation_id: conversation.id,
          user_id: user.id
        }
      });

      // Try to get agent response, fallback to echo if agent fails
      let response: string;
      let metadata = {};
      
      try {
        const agent = await this.initAgent();
        if (agent) {
          const rawResponse = await agent.invoke(message);
          response = this.formatToolResponse(rawResponse);
          
          // Add metadata for special responses
          if (message.toLowerCase().includes('list') && message.toLowerCase().includes('file')) {
            metadata = {
              type: 'file-list',
              timestamp: new Date().toISOString()
            };
          }
        } else {
          response = "I'm currently experiencing some technical difficulties with my tools. I can still chat, but some advanced features might not be available.";
        }
      } catch (error) {
        console.error('Error getting agent response:', error);
        response = "I'm currently experiencing some technical difficulties. Please try again in a moment.";
      }

      // Store assistant response
      const assistantMessage = await this.prisma.chatMessage.create({
        data: {
          content: response,
          role: 'assistant',
          conversation_id: conversation.id,
          user_id: user.id,
          parent_id: userMessage.id,
          metadata
        }
      });

      // Create response object
      const result: ChatMessage = {
        id: assistantMessage.id,
        content: assistantMessage.content,
        role: 'assistant',
        userId: assistantMessage.user_id ?? '',
        username: user.name ?? '',
        conversationId: assistantMessage.conversation_id,
        parentId: assistantMessage.parent_id ?? undefined,
        type: 'text',
        metadata: assistantMessage.metadata as { [key: string]: unknown } ?? {},
        createdAt: assistantMessage.created_at,
        updatedAt: assistantMessage.updated_at
      };

      return result;
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }

  async cleanupResources() {
    if (this.agent) {
      try {
        await this.agent.cleanupResources();
      } catch (error) {
        console.error('Error cleaning up agent:', error);
      }
      this.agent = null;
    }
  }
}