import { prisma } from '../../lib/prisma.js';
import { broadcastLog } from '../../utils/logger.js';
import type { ChatMessage, ToolUsage } from '../../types/db.js';
import type { DatabaseQueryOptions } from '../../modules/chat/chat.service.js';

export class ConversationService {
    async archiveConversation(conversationId: string): Promise<void> {
        try {
            await prisma.conversation.update({
                where: { id: conversationId },
                data: { is_archived: true }
            });
        } catch (error) {
            broadcastLog('error', `Error archiving conversation: ${error}`);
            throw error;
        }
    }

    async unarchiveConversation(conversationId: string): Promise<void> {
        try {
            await prisma.conversation.update({
                where: { id: conversationId },
                data: { is_archived: false }
            });
        } catch (error) {
            broadcastLog('error', `Error unarchiving conversation: ${error}`);
            throw error;
        }
    }

    async updateSummary(conversationId: string, summary: string): Promise<void> {
        try {
            await prisma.conversation.update({
                where: { id: conversationId },
                data: { summary }
            });
        } catch (error) {
            broadcastLog('error', `Error updating conversation summary: ${error}`);
            throw error;
        }
    }

    async getArchivedConversations(userId: string, options: DatabaseQueryOptions) {
        const { skip, take, search, sortBy, sortOrder } = options;
        
        return await prisma.conversation.findMany({
            where: {
                user_id: userId,
                is_archived: true,
                title: search ? { contains: search, mode: 'insensitive' } : undefined
            },
            orderBy: {
                [sortBy || 'created_at']: sortOrder || 'desc'
            },
            skip,
            take,
            include: {
                messages: true,
                stats: true
            }
        });
    }

    async getActiveConversations(userId: string, options: DatabaseQueryOptions) {
        const { skip, take, search, sortBy, sortOrder } = options;
        
        // Convert camelCase to snake_case for sorting
        const sortField = sortBy?.replace(/([A-Z])/g, '_$1').toLowerCase() || 'created_at';
        
        return await prisma.conversation.findMany({
            where: {
                user_id: userId,
                is_archived: false,
                title: search ? { contains: search, mode: 'insensitive' } : undefined
            },
            orderBy: {
                [sortField]: sortOrder || 'desc'
            },
            skip,
            take,
            include: {
                messages: true,
                stats: true
            }
        });
    }

    async generateSummary(messages: ChatMessage[]): Promise<string> {
        // Extract key points from the conversation
        const summary = messages.reduce((acc, msg) => {
            if (msg.role === 'user') {
                acc.questions.push(msg.content);
            } else if (msg.metadata && 'toolUsage' in msg.metadata) {
                const toolUsage = msg.metadata.toolUsage as ToolUsage;
                acc.toolUsage.push(`Used ${toolUsage.name}`);
            }
            return acc;
        }, { questions: [] as string[], toolUsage: [] as string[] });

        // Format the summary
        return [
            `Questions asked: ${summary.questions.length}`,
            summary.questions.map(q => `- ${q}`).join('\n'),
            summary.toolUsage.length ? '\nTools used:' : '',
            summary.toolUsage.map(t => `- ${t}`).join('\n')
        ].filter(Boolean).join('\n');
    }

    async getActiveConversationsCount(userId: string, search?: string): Promise<number> {
        return await prisma.conversation.count({
            where: {
                user_id: userId,
                is_archived: false,
                title: search ? { contains: search, mode: 'insensitive' } : undefined
            }
        });
    }

    async getArchivedConversationsCount(userId: string, search?: string): Promise<number> {
        return await prisma.conversation.count({
            where: {
                user_id: userId,
                is_archived: true,
                title: search ? { contains: search, mode: 'insensitive' } : undefined
            }
        });
    }
} 