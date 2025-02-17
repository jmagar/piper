import type { Request, Response } from 'express';
import { broadcastLog } from '../../utils/logger.js';
import { ChatService } from './chat.service.js';
import type { ChatRequest } from './chat.types.js';

export function createChatController(chatService: ChatService) {
    const router = {
        handleChat: async (req: ChatRequest, res: Response): Promise<void> => {
            try {
                broadcastLog('info', '=== New Chat Request ===');
                broadcastLog('info', 'Request headers: ' + JSON.stringify(req.headers));
                broadcastLog('info', 'Request body: ' + JSON.stringify(req.body));
                
                const { message, conversationId, userId } = req.body;

                // Input validation
                if (!message || typeof message !== 'string') {
                    broadcastLog('error', 'Invalid message format: ' + JSON.stringify(message));
                    res.status(400).json({ 
                        error: 'Message is required and must be a string',
                        received: message 
                    });
                    return;
                }

                const { userMessage, assistantMessage } = await chatService.processMessage(message, conversationId, userId);

                broadcastLog('info', '=== Sending Response ===');
                broadcastLog('info', 'Response length: ' + assistantMessage.content.length);
                
                // Return both messages with their proper database IDs
                res.json({
                    userMessage: {
                        id: userMessage.id,
                        role: userMessage.role,
                        content: userMessage.content,
                        timestamp: userMessage.created_at,
                        status: 'sent',
                        metadata: {
                            ...userMessage.metadata,
                            username: 'User'
                        }
                    },
                    assistantMessage: {
                        id: assistantMessage.id,
                        role: assistantMessage.role,
                        content: assistantMessage.content,
                        timestamp: assistantMessage.created_at,
                        status: 'sent',
                        metadata: {
                            ...assistantMessage.metadata,
                            username: 'Assistant'
                        }
                    }
                });

                broadcastLog('info', 'Response sent successfully');

            } catch (error) {
                broadcastLog('error', '=== Error in Chat Controller ===');
                broadcastLog('error', 'Error details: ' + error);
                res.status(500).json({ 
                    error: 'Internal server error',
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        },

        handleStarMessage: async (req: Request, res: Response): Promise<void> => {
            try {
                const { messageId, userId, note } = req.body;

                if (!messageId || !userId) {
                    res.status(400).json({ error: 'Message ID and User ID are required' });
                    return;
                }

                await chatService.starMessage(messageId, userId, note);
                res.status(200).json({ success: true });
            } catch (error) {
                broadcastLog('error', `Error starring message: ${error}`);
                res.status(500).json({ error: 'Failed to star message' });
            }
        },

        handleUnstarMessage: async (req: Request, res: Response): Promise<void> => {
            try {
                const { messageId, userId } = req.body;

                if (!messageId || !userId) {
                    res.status(400).json({ error: 'Message ID and User ID are required' });
                    return;
                }

                await chatService.unstarMessage(messageId, userId);
                res.status(200).json({ success: true });
            } catch (error) {
                broadcastLog('error', `Error unstarring message: ${error}`);
                res.status(500).json({ error: 'Failed to unstar message' });
            }
        },

        handleGetStarredMessages: async (req: Request, res: Response): Promise<void> => {
            try {
                const { userId } = req.params;
                const { 
                    page = '1',
                    limit = '10',
                    search = '',
                    sortBy = 'createdAt',
                    sortOrder = 'desc'
                } = req.query;

                if (!userId) {
                    res.status(400).json({ error: 'User ID is required' });
                    return;
                }

                const messages = await chatService.getStarredMessages(
                    userId,
                    {
                        page: parseInt(page as string),
                        limit: parseInt(limit as string),
                        search: search as string,
                        sortBy: sortBy as string,
                        sortOrder: sortOrder as 'asc' | 'desc'
                    }
                );

                res.status(200).json(messages);
            } catch (error) {
                broadcastLog('error', `Error getting starred messages: ${error}`);
                res.status(500).json({ error: 'Failed to get starred messages' });
            }
        },

        handleArchiveConversation: async (req: Request, res: Response): Promise<void> => {
            try {
                const { conversationId } = req.body;

                if (!conversationId) {
                    res.status(400).json({ error: 'Conversation ID is required' });
                    return;
                }

                await chatService.archiveConversation(conversationId);
                res.status(200).json({ success: true });
            } catch (error) {
                broadcastLog('error', `Error archiving conversation: ${error}`);
                res.status(500).json({ error: 'Failed to archive conversation' });
            }
        },

        handleUnarchiveConversation: async (req: Request, res: Response): Promise<void> => {
            try {
                const { conversationId } = req.body;

                if (!conversationId) {
                    res.status(400).json({ error: 'Conversation ID is required' });
                    return;
                }

                await chatService.unarchiveConversation(conversationId);
                res.status(200).json({ success: true });
            } catch (error) {
                broadcastLog('error', `Error unarchiving conversation: ${error}`);
                res.status(500).json({ error: 'Failed to unarchive conversation' });
            }
        },

        handleGetConversations: async (req: Request, res: Response): Promise<void> => {
            try {
                const { userId } = req.params;
                const { 
                    type = 'active',
                    page = '1',
                    limit = '10',
                    search = '',
                    sortBy = 'createdAt',
                    sortOrder = 'desc'
                } = req.query;

                if (!userId) {
                    res.status(400).json({ error: 'User ID is required' });
                    return;
                }

                const conversations = type === 'archived'
                    ? await chatService.getArchivedConversations(
                        userId,
                        {
                            page: parseInt(page as string),
                            limit: parseInt(limit as string),
                            search: search as string,
                            sortBy: sortBy as string,
                            sortOrder: sortOrder as 'asc' | 'desc'
                        }
                    )
                    : await chatService.getActiveConversations(
                        userId,
                        {
                            page: parseInt(page as string),
                            limit: parseInt(limit as string),
                            search: search as string,
                            sortBy: sortBy as string,
                            sortOrder: sortOrder as 'asc' | 'desc'
                        }
                    );

                res.status(200).json(conversations);
            } catch (error) {
                broadcastLog('error', `Error getting conversations: ${error}`);
                res.status(500).json({ error: 'Failed to get conversations' });
            }
        },

        handleGetStats: async (req: Request, res: Response): Promise<void> => {
            try {
                const { userId, conversationId } = req.query;

                if (!userId && !conversationId) {
                    res.status(400).json({ error: 'Either User ID or Conversation ID is required' });
                    return;
                }

                if (userId) {
                    const stats = await chatService.getUserStats(userId as string);
                    res.status(200).json(stats);
                } else {
                    const stats = await chatService.getConversationStats(conversationId as string);
                    res.status(200).json(stats);
                }
            } catch (error) {
                broadcastLog('error', `Error getting stats: ${error}`);
                res.status(500).json({ error: 'Failed to get stats' });
            }
        }
    };

    return router;
} 