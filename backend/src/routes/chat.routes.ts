import { PrismaClient } from '@prisma/client';
import debug from 'debug';
import type { Request, Response } from 'express';
import { Router } from 'express';

import { ChatLangChainService } from '../services/chat/chat-langchain.service.mjs';
import { ChatService } from '../services/chat/chat.service.js';
import type { ChatMessage, ChatMetadata } from '../types/chat.mjs';
import { createMetadata } from '../types/chat.mjs';

const log = debug('mcp:chat:routes');
const error = debug('mcp:chat:routes:error');

const router: Router = Router();
const prisma = new PrismaClient();
const legacyService = new ChatService(prisma);
const langchainService = new ChatLangChainService(prisma);

interface ChatRequest {
  content: string;
  userId: string;
  conversationId?: string;
}

interface StarMessageRequest {
  messageId: string;
  userId: string;
  note?: string;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

type ChatResponse = ChatMessage | ErrorResponse;

function extractTextFromJson(content: string): string {
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data) && data.length > 0 && 'text' in data[0]) {
      return data.map(item => item.text).join('\n');
    }
    return content;
  } catch {
    return content;
  }
}

// Get messages
router.get('/', async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { conversationId, cursor, limit = '20', search, threadId } = req.query;

    if (conversationId && typeof conversationId !== 'string') {
      res.status(400).json({ error: 'Conversation ID must be a string' });
      return;
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        conversation_id: conversationId as string,
        ...(threadId ? { parent_id: threadId as string } : {}),
        ...(search ? {
          content: {
            contains: search as string,
            mode: 'insensitive'
          }
        } : {})
      },
      take: parseInt(limit as string),
      ...(cursor ? { 
        skip: 1,
        cursor: {
          id: cursor as string
        }
      } : {}),
      orderBy: {
        created_at: 'desc'
      }
    });

    // Get the next cursor
    const nextCursor = messages.length === parseInt(limit as string)
      ? messages[messages.length - 1].id
      : null;

    // Transform messages to match API response type
    const transformedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      role: msg.role,
      conversation_id: msg.conversation_id,
      user_id: msg.user_id,
      parent_id: msg.parent_id,
      thread_summary: msg.thread_summary,
      metadata: msg.metadata,
      created_at: msg.created_at,
      updated_at: msg.updated_at
    }));

    res.json({
      messages: transformedMessages,
      nextCursor,
      total: await prisma.chatMessage.count({
        where: {
          conversation_id: conversationId as string,
          ...(threadId ? { parent_id: threadId as string } : {})
        }
      })
    });
  } catch (err) {
    error('Error getting messages: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ 
      error: 'Failed to get messages',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// Handle chat messages
router.post('/', async (
  req: Request<Record<string, never>, ChatResponse, ChatRequest>,
  res: Response<ChatResponse>
): Promise<void> => {
  try {
    const { content, userId, conversationId } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Content must be a string' });
      return;
    }

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'User ID must be a string' });
      return;
    }

    // Try LangChain service first, fallback to legacy
    let response;
    try {
      log('Processing message with LangChain service');
      response = await langchainService.processMessage(content, userId, conversationId);
      log('Message processed successfully by LangChain service');
    } catch (err) {
      error('LangChain service failed, falling back to legacy: %s', err instanceof Error ? err.message : String(err));
      response = await legacyService.processMessage(content, userId);
      log('Message processed by legacy service');
    }

    // Extract text from JSON if needed
    const cleanContent = extractTextFromJson(response.content);
    const metadata: ChatMetadata = {
      type: response.type,
      timestamp: new Date().toISOString()
    };

    res.json({
      ...response,
      content: cleanContent,
      metadata: createMetadata(metadata)
    });
  } catch (err) {
    error('Error processing chat message: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ 
      error: 'Failed to process message',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// Star a message
router.post('/messages/star', async (
  req: Request<Record<string, never>, unknown, StarMessageRequest>,
  res: Response
): Promise<void> => {
  try {
    const { messageId, userId, note } = req.body;

    if (!messageId || typeof messageId !== 'string') {
      res.status(400).json({ error: 'Message ID must be a string' });
      return;
    }

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'User ID must be a string' });
      return;
    }

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    const starred = await prisma.starredMessage.create({
      data: {
        message_id: messageId,
        user_id: userId,
        note: note,
      }
    });

    // Update message metadata
    const currentMetadata = message.metadata as ChatMetadata || {};
    await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        metadata: createMetadata({
          ...currentMetadata,
          bookmarked: true
        })
      }
    });

    res.json(starred);
  } catch (err) {
    error('Error starring message: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ 
      error: 'Failed to star message',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// Unstar a message
router.post('/messages/unstar', async (
  req: Request<Record<string, never>, unknown, StarMessageRequest>,
  res: Response
): Promise<void> => {
  try {
    const { messageId, userId } = req.body;

    if (!messageId || typeof messageId !== 'string') {
      res.status(400).json({ error: 'Message ID must be a string' });
      return;
    }

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'User ID must be a string' });
      return;
    }

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    await prisma.starredMessage.delete({
      where: {
        message_id_user_id: {
          message_id: messageId,
          user_id: userId
        }
      }
    });

    // Update message metadata
    const currentMetadata = message.metadata as ChatMetadata || {};
    await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        metadata: createMetadata({
          ...currentMetadata,
          bookmarked: false
        })
      }
    });

    res.json({ success: true });
  } catch (err) {
    error('Error unstarring message: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ 
      error: 'Failed to unstar message',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// Get user conversations
router.get('/conversations/:userId', async (
  req: Request<{ userId: string }>,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'User ID must be a string' });
      return;
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        user_id: userId
      },
      orderBy: {
        last_message_at: 'desc'
      },
      include: {
        _count: {
          select: {
            messages: true
          }
        }
      }
    });

    // Transform conversations to match API response type
    const transformedConversations = conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      metadata: {
        summary: conv.summary,
        messageCount: conv._count.messages
      }
    }));

    res.json(transformedConversations);
  } catch (err) {
    error('Error getting conversations: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ 
      error: 'Failed to get conversations',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// Cleanup handler
process.on('SIGTERM', async () => {
  await legacyService.cleanupResources();
  await langchainService.cleanupResources();
  await prisma.$disconnect();
});

export default router;