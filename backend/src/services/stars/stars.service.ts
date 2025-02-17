import { prisma } from '../../lib/prisma.js';
import { broadcastLog } from '../../utils/logger.js';
import { Prisma } from '@prisma/client';
import type { DatabaseQueryOptions } from '../../modules/chat/chat.service.js';

export class StarsService {
    async starMessage(
        messageId: string,
        userId: string,
        note?: string
    ): Promise<void> {
        try {
            await prisma.starredMessage.create({
                data: {
                    message_id: messageId,
                    user_id: userId,
                    note
                }
            });

            // Update user stats
            await prisma.userStats.upsert({
                where: { user_id: userId },
                create: {
                    user_id: userId,
                    total_starred: 1
                },
                update: {
                    total_starred: { increment: 1 }
                }
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    broadcastLog('info', `Message ${messageId} already starred by user ${userId}`);
                    return;
                }
            }
            broadcastLog('error', `Error starring message: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    async unstarMessage(
        messageId: string,
        userId: string
    ): Promise<void> {
        try {
            await prisma.starredMessage.delete({
                where: {
                    message_id_user_id: {
                        message_id: messageId,
                        user_id: userId
                    }
                }
            });

            // Update user stats
            await prisma.userStats.update({
                where: { user_id: userId },
                data: {
                    total_starred: { decrement: 1 }
                }
            });
        } catch (error) {
            broadcastLog('error', `Error unstarring message: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    async getStarredMessages(userId: string, options: DatabaseQueryOptions) {
        const { skip, take, search, sortBy, sortOrder } = options;
        
        // Convert camelCase to snake_case for sorting
        const sortField = sortBy?.replace(/([A-Z])/g, '_$1').toLowerCase() || 'created_at';
        
        return await prisma.starredMessage.findMany({
            where: {
                user_id: userId,
                message: search ? {
                    content: { contains: search, mode: 'insensitive' }
                } : undefined
            },
            orderBy: {
                [sortField]: sortOrder || 'desc'
            },
            skip,
            take,
            include: {
                message: true
            }
        });
    }

    async getStarredMessagesCount(userId: string, search?: string): Promise<number> {
        return await prisma.starredMessage.count({
            where: {
                user_id: userId,
                message: search ? {
                    content: { contains: search, mode: 'insensitive' }
                } : undefined
            }
        });
    }

    async isMessageStarred(
        messageId: string,
        userId: string
    ): Promise<boolean> {
        const star = await prisma.starredMessage.findUnique({
            where: {
                message_id_user_id: {
                    message_id: messageId,
                    user_id: userId
                }
            }
        });
        return !!star;
    }
} 