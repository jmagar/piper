import { prisma } from '../../lib/prisma.js';
import { broadcastLog } from '../../utils/logger.js';

export class StatsService {
    async updateUserStats(userId: string, messageLength: number): Promise<void> {
        try {
            // First get current stats
            const currentStats = await prisma.userStats.findUnique({
                where: { user_id: userId }
            });

            if (!currentStats) {
                // Create new stats if they don't exist
                await prisma.userStats.create({
                    data: {
                        user_id: userId,
                        total_messages: 1,
                        total_conversations: 1,
                        average_response_length: messageLength,
                        last_active: new Date()
                    }
                });
            } else {
                // Calculate new average
                const newAverage = (
                    (currentStats.average_response_length * currentStats.total_messages + messageLength) /
                    (currentStats.total_messages + 1)
                );

                // Update existing stats
                await prisma.userStats.update({
                    where: { user_id: userId },
                    data: {
                        total_messages: { increment: 1 },
                        average_response_length: newAverage,
                        last_active: new Date()
                    }
                });
            }
        } catch (error) {
            broadcastLog('error', `Error updating user stats: ${error}`);
        }
    }

    async updateConversationStats(
        conversationId: string,
        role: 'user' | 'assistant',
        toolUsed: boolean
    ): Promise<void> {
        try {
            await prisma.conversationStats.upsert({
                where: { conversation_id: conversationId },
                create: {
                    conversation_id: conversationId,
                    message_count: 1,
                    user_message_count: role === 'user' ? 1 : 0,
                    bot_message_count: role === 'assistant' ? 1 : 0,
                    tool_usage_count: toolUsed ? 1 : 0
                },
                update: {
                    message_count: { increment: 1 },
                    user_message_count: role === 'user' ? { increment: 1 } : undefined,
                    bot_message_count: role === 'assistant' ? { increment: 1 } : undefined,
                    tool_usage_count: toolUsed ? { increment: 1 } : undefined
                }
            });
        } catch (error) {
            broadcastLog('error', `Error updating conversation stats: ${error}`);
        }
    }

    async getUserStats(userId: string) {
        return await prisma.userStats.findUnique({
            where: { user_id: userId }
        });
    }

    async getConversationStats(conversationId: string) {
        return await prisma.conversationStats.findUnique({
            where: { conversation_id: conversationId }
        });
    }
} 