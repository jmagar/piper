import { prisma } from '../../lib/prisma.js';
import type { ChatMessage, ToolUsage } from '../../types/db.js';

export class ChatRepository {
    async createConversation(): Promise<{ id: string; messages: ChatMessage[] }> {
        const conversation = await prisma.conversation.create({
            data: {
                messages: {
                    create: []
                }
            },
            include: {
                messages: true
            }
        });

        return {
            id: conversation.id,
            messages: conversation.messages.map(msg => ({
                id: msg.id,
                created_at: msg.created_at,
                updated_at: msg.updated_at,
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                metadata: msg.metadata as Record<string, unknown> || {},
                conversation_id: msg.conversation_id,
                user_id: msg.user_id
            }))
        };
    }

    async getConversation(id: string): Promise<{ id: string; messages: ChatMessage[] } | null> {
        const conversation = await prisma.conversation.findUnique({
            where: { id },
            include: {
                messages: true
            }
        });

        if (!conversation) return null;

        return {
            id: conversation.id,
            messages: conversation.messages.map(msg => ({
                id: msg.id,
                created_at: msg.created_at,
                updated_at: msg.updated_at,
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                metadata: msg.metadata as Record<string, unknown> || {},
                conversation_id: msg.conversation_id,
                user_id: msg.user_id
            }))
        };
    }

    async addMessage(
        conversationId: string,
        content: string,
        role: 'user' | 'assistant',
        toolUsage?: ToolUsage
    ): Promise<ChatMessage> {
        const message = await prisma.chatMessage.create({
            data: {
                content,
                role,
                metadata: toolUsage ? { toolUsage: JSON.parse(JSON.stringify(toolUsage)) } : {},
                conversation: {
                    connect: { id: conversationId }
                }
            }
        });

        return {
            id: message.id,
            created_at: message.created_at,
            updated_at: message.updated_at,
            role: message.role as 'user' | 'assistant',
            content: message.content,
            metadata: message.metadata as Record<string, unknown> || {},
            conversation_id: message.conversation_id,
            user_id: message.user_id
        };
    }
} 