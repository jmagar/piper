import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import type { ExtendedChatMessage } from '../types/chat.js';
import { Prisma, ChatMessage as PrismaChatMessage, MessageReaction, User } from '@prisma/client';

const router = Router();

// Get messages with cursor-based pagination and search
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const { 
            conversationId,
            cursor,
            limit = '20',
            search,
            startDate,
            endDate,
            threadId
        } = req.query;

        // Build where clause
        const where: Prisma.ChatMessageWhereInput = {
            AND: [
                conversationId ? { conversation_id: conversationId as string } : {},
                threadId ? { parent_id: threadId as string } : { parent_id: null }, // Only top-level messages if no threadId
                search ? { content: { contains: search as string, mode: 'insensitive' } } : {},
                startDate ? { created_at: { gte: new Date(startDate as string) } } : {},
                endDate ? { created_at: { lte: new Date(endDate as string) } } : {}
            ]
        };

        // Check cache for non-search queries
        if (!search && !startDate && !endDate) {
            try {
                const cacheKey = `messages:${conversationId || 'latest'}:${cursor || 'start'}:${limit}`;
                const cachedMessages = await redis.get(cacheKey);
                
                if (cachedMessages) {
                    const parsed = JSON.parse(cachedMessages);
                    res.json(parsed);
                    return;
                }
            } catch (error) {
                console.error('Failed to get cached messages:', error);
                // Continue with database query
            }
        }

        // Fetch messages
        const messages = await prisma.chatMessage.findMany({
            where,
            take: parseInt(limit as string),
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor as string } : undefined,
            orderBy: { created_at: 'desc' },
            include: {
                reactions: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                bookmarks: true,
                replies: {
                    take: 1,
                    orderBy: { created_at: 'desc' },
                    select: {
                        id: true,
                        created_at: true
                    }
                },
                _count: {
                    select: {
                        replies: true
                    }
                }
            }
        }) as PrismaMessageWithRelations[];

        // Get next cursor
        const nextCursor = messages.length === parseInt(limit as string)
            ? messages[messages.length - 1].id
            : null;

        // Transform to ExtendedChatMessage format
        const formattedMessages = messages.map(formatMessage);

        const response = {
            messages: formattedMessages,
            nextCursor,
            total: await prisma.chatMessage.count({ where })
        };

        // Cache response for non-search queries
        if (!search && !startDate && !endDate) {
            const cacheKey = `messages:${conversationId || 'latest'}:${cursor || 'start'}:${limit}`;
            await redis.set(cacheKey, JSON.stringify(response), 'EX', 300); // Cache for 5 minutes
        }

        res.json(response);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Create a new message with threading support
router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const { 
            content, 
            userId, 
            username, 
            conversationId, 
            parentId,
            type = 'text', 
            metadata = {} 
        } = req.body;

        // Use a transaction to ensure data consistency
        const result = await prisma.$transaction(async (tx) => {
            // Create or get conversation
            const conversation = conversationId 
                ? await tx.conversation.findUnique({ where: { id: conversationId } })
                : await tx.conversation.create({
                    data: {
                        title: 'New Conversation',
                        user_id: userId,
                    }
                });

            if (!conversation) {
                throw new Error('Conversation not found');
            }

            // Create message
            const message = await tx.chatMessage.create({
                data: {
                    content,
                    role: 'user',
                    conversation_id: conversation.id,
                    user_id: userId,
                    parent_id: parentId,
                    metadata: {
                        ...metadata,
                        username,
                        type
                    }
                },
                include: {
                    reactions: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    },
                    bookmarks: true,
                    replies: {
                        take: 1,
                        orderBy: { created_at: 'desc' },
                        select: {
                            id: true,
                            created_at: true
                        }
                    },
                    _count: {
                        select: {
                            replies: true
                        }
                    }
                }
            }) as PrismaMessageWithRelations;

            // Update conversation last_message_at
            await tx.conversation.update({
                where: { id: conversation.id },
                data: { last_message_at: new Date() }
            });

            return { message, conversationId: conversation.id };
        });

        const formattedMessage = formatMessage(result.message);

        // Update thread summary if this is a reply (outside transaction as it's not critical)
        if (parentId) {
            await updateThreadSummary(parentId).catch(error => {
                console.error('Failed to update thread summary:', error);
            });
        }

        // Invalidate caches (outside transaction as it's not critical)
        await invalidateMessageCaches(result.conversationId);

        res.status(201).json(formattedMessage);
    } catch (error) {
        console.error('Error creating message:', error);
        if (error instanceof Error && error.message === 'Conversation not found') {
            res.status(404).json({ error: 'Conversation not found' });
        } else {
            res.status(500).json({ error: 'Failed to create message' });
        }
    }
});

// Batch update reactions
router.post('/reactions/batch', async (req: Request, res: Response): Promise<void> => {
    try {
        const { messageId, userId, reactions } = req.body;

        // Delete existing reactions
        await prisma.messageReaction.deleteMany({
            where: {
                message_id: messageId,
                user_id: userId
            }
        });

        // Add new reactions
        if (reactions.length > 0) {
            await prisma.messageReaction.createMany({
                data: reactions.map((emoji: string) => ({
                    message_id: messageId,
                    user_id: userId,
                    emoji
                }))
            });
        }

        const message = await prisma.chatMessage.findUnique({
            where: { id: messageId },
            include: {
                reactions: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });

        if (!message) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }

        // Invalidate cache
        await invalidateMessageCaches(message.conversation_id);

        res.json({ reactions: groupReactions(message.reactions) });
    } catch (error) {
        console.error('Error updating reactions:', error);
        res.status(500).json({ error: 'Failed to update reactions' });
    }
});

// Toggle bookmark
router.post('/:messageId/bookmark', async (req: Request, res: Response): Promise<void> => {
    try {
        const { messageId } = req.params;
        const { userId, note, tags } = req.body;

        const existingBookmark = await prisma.messageBookmark.findUnique({
            where: {
                message_id_user_id: {
                    message_id: messageId,
                    user_id: userId
                }
            }
        });

        if (existingBookmark) {
            await prisma.messageBookmark.delete({
                where: { id: existingBookmark.id }
            });
            res.json({ bookmarked: false });
        } else {
            const bookmark = await prisma.messageBookmark.create({
                data: {
                    message_id: messageId,
                    user_id: userId,
                    note,
                    tags
                }
            });
            res.json({ bookmarked: true, bookmark });
        }

        // Invalidate cache
        const message = await prisma.chatMessage.findUnique({
            where: { id: messageId }
        });
        if (message) {
            await invalidateMessageCaches(message.conversation_id);
        }
    } catch (error) {
        console.error('Error toggling bookmark:', error);
        res.status(500).json({ error: 'Failed to toggle bookmark' });
    }
});

// Export conversation
router.get('/:conversationId/export', async (req: Request, res: Response): Promise<void> => {
    try {
        const { conversationId } = req.params;
        const { format = 'json' } = req.query;

        const messages = await prisma.chatMessage.findMany({
            where: { conversation_id: conversationId },
            orderBy: { created_at: 'asc' },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                },
                reactions: true,
                bookmarks: true
            }
        });

        if (format === 'txt') {
            const text = messages.map(msg => 
                `[${msg.created_at.toISOString()}] ${msg.user?.name || 'Unknown'}: ${msg.content}`
            ).join('\n');
            
            res.setHeader('Content-Type', 'text/plain');
            res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversationId}.txt"`);
            res.send(text);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversationId}.json"`);
            res.json(messages);
        }
    } catch (error) {
        console.error('Error exporting conversation:', error);
        res.status(500).json({ error: 'Failed to export conversation' });
    }
});

// Star a message
router.post('/star', async (req: Request, res: Response): Promise<void> => {
    try {
        const { messageId, userId } = req.body;

        // Verify message exists
        const message = await prisma.chatMessage.findUnique({
            where: { id: messageId }
        });

        if (!message) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }

        // Verify user exists and has stats
        const userStats = await prisma.userStats.upsert({
            where: { user_id: userId },
            create: {
                user_id: userId,
                total_starred: 0,
                total_messages: 0,
                total_conversations: 0
            },
            update: {}
        });

        // Create starred message
        await prisma.starredMessage.create({
            data: {
                message_id: messageId,
                user_id: userId
            }
        });

        // Update user stats
        await prisma.userStats.update({
            where: { user_id: userId },
            data: {
                total_starred: { increment: 1 }
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error starring message:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            res.status(400).json({ error: 'Message already starred' });
        } else {
            res.status(500).json({ error: 'Failed to star message' });
        }
    }
});

// Unstar a message
router.post('/unstar', async (req: Request, res: Response): Promise<void> => {
    try {
        const { messageId, userId } = req.body;

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

        res.json({ success: true });
    } catch (error) {
        console.error('Error unstarring message:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            res.status(404).json({ error: 'Message not starred' });
        } else {
            res.status(500).json({ error: 'Failed to unstar message' });
        }
    }
});

// Helper functions
type PrismaMessageReactionWithUser = MessageReaction & {
    user: Pick<User, 'id' | 'name'>;
};

type PrismaMessageWithRelations = PrismaChatMessage & {
    reactions: PrismaMessageReactionWithUser[];
    bookmarks: unknown[];
    replies: { id: string; created_at: Date }[];
    _count: { replies: number };
};

function groupReactions(reactions: PrismaMessageReactionWithUser[]): Record<string, {
    count: number;
    users: { id: string; name: string }[];
}> {
    const grouped = reactions.reduce((acc, reaction) => {
        const emoji = reaction.emoji;
        if (!acc[emoji]) {
            acc[emoji] = {
                count: 0,
                users: []
            };
        }
        acc[emoji].count++;
        if (reaction.user) {
            acc[emoji].users.push({
                id: reaction.user.id,
                name: reaction.user.name || 'Anonymous'
            });
        }
        return acc;
    }, {} as Record<string, {
        count: number;
        users: { id: string; name: string }[];
    }>);

    return grouped;
}

async function updateThreadSummary(messageId: string) {
    const thread = await prisma.chatMessage.findMany({
        where: { parent_id: messageId },
        orderBy: { created_at: 'asc' }
    });

    if (thread.length === 0) {
        // If there are no replies, clear the thread summary
        await prisma.chatMessage.update({
            where: { id: messageId },
            data: { thread_summary: null }
        });
        return;
    }

    const lastMessage = thread[thread.length - 1];
    const summary = `Thread with ${thread.length} ${thread.length === 1 ? 'reply' : 'replies'}. Last reply: ${lastMessage.content.substring(0, 100)}${lastMessage.content.length > 100 ? '...' : ''}`;

    await prisma.chatMessage.update({
        where: { id: messageId },
        data: { thread_summary: summary }
    });
}

async function invalidateMessageCaches(conversationId: string) {
    try {
        const keys = await redis.keys(`messages:${conversationId}:*`);
        if (keys.length > 0) {
            await redis.del(keys);
        }
    } catch (error) {
        console.error('Failed to invalidate message caches:', error);
        // Don't throw - cache errors shouldn't break the main flow
    }
}

function formatMessage(message: PrismaMessageWithRelations): ExtendedChatMessage {
    const reactions = groupReactions(message.reactions);
    return {
        id: message.id,
        role: message.role as 'user' | 'assistant',
        content: message.content,
        timestamp: message.created_at,
        status: 'sent',
        metadata: {
            edited: message.metadata ? (message.metadata as Record<string, unknown>).edited as boolean : false,
            editedAt: message.updated_at,
            reactions,
            hasThread: message._count?.replies > 0,
            lastReplyAt: message.replies?.[0]?.created_at,
            replyCount: message._count?.replies || 0,
            bookmarked: message.bookmarks?.length > 0,
            ...(message.metadata as Record<string, unknown> || {})
        }
    };
}

export default router; 