import { HumanMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { broadcastLog } from '../../utils/logger.js';
import { Agent } from '../../types/index.js';
import { ChatRepository } from './chat.repository.js';
import { MessageCacheService } from '../../services/cache/message.cache.js';
import { ToolCacheService } from '../../services/cache/tool.cache.js';
import { SessionCacheService } from '../../services/cache/session.cache.js';
import { StatsService } from '../../services/stats/stats.service.js';
import { StarsService } from '../../services/stars/stars.service.js';
import { ConversationService } from '../../services/conversation/conversation.service.js';
import type { ToolUsage } from './chat.types.js';
import type { ChatMessage } from '../../types/db.js';

export interface QueryOptions {
    page: number;
    limit: number;
    search: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}

export interface DatabaseQueryOptions {
    skip: number;
    take: number;
    search: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}

export class ChatService {
    private readonly statsService: StatsService;
    private readonly starsService: StarsService;
    private readonly conversationService: ConversationService;

    constructor(
        private readonly agent: Agent,
        private readonly chatRepository: ChatRepository,
        private readonly messageCache: MessageCacheService,
        private readonly toolCache: ToolCacheService,
        private readonly sessionCache: SessionCacheService
    ) {
        this.statsService = new StatsService();
        this.starsService = new StarsService();
        this.conversationService = new ConversationService();
    }

    async processMessage(
        message: string,
        conversationId?: string,
        userId?: string
    ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
        try {
            // Update user status if provided
            if (userId) {
                await this.sessionCache.updateUserStatus(userId, 'online');
            }

            // Set typing indicator
            if (userId && conversationId) {
                await this.sessionCache.setTypingIndicator(userId, conversationId);
            }

            // Get or create conversation
            const conversation = conversationId
                ? await this.chatRepository.getConversation(conversationId)
                : await this.chatRepository.createConversation();

            if (!conversation) {
                throw new Error('Conversation not found');
            }

            // Check tool cache
            const toolPattern = /Action: (\w+)\nParameters: (.*?)(?=\n|$)/g;
            let match;
            const cachedResults: unknown[] = [];
            while ((match = toolPattern.exec(message)) !== null) {
                const [, toolName, input] = match;
                const cachedResult = await this.toolCache.getCachedToolResult(toolName, input);
                if (cachedResult) {
                    cachedResults.push(cachedResult);
                }
            }

            let currentToolUsage: ToolUsage | undefined;
            let response = '';
            const startTime = Date.now();

            // Process message with agent
            try {
                const result = await this.agent.invoke(
                    { messages: [new HumanMessage(message)] },
                    { configurable: { thread_id: conversation.id } }
                );

                // Extract tool usage if any
                const toolMessages = result.messages.filter(
                    (msg: BaseMessage) => msg._getType() === 'tool'
                );

                if (toolMessages.length > 0) {
                    const toolMessage = toolMessages[0];
                    const toolContent = toolMessage.content;
                    
                    let toolName = 'unknown';
                    let toolInput = '';
                    let toolOutput = '';
                    
                    if (typeof toolContent === 'string') {
                        const nameMatch = toolContent.match(/Tool: (.*?)(?:\n|$)/);
                        const inputMatch = toolContent.match(/Input: (.*?)(?:\n|$)/);
                        const outputMatch = toolContent.match(/Output: (.*?)(?:\n|$)/);
                        
                        if (nameMatch) toolName = nameMatch[1].trim();
                        if (inputMatch) toolInput = inputMatch[1].trim();
                        if (outputMatch) toolOutput = outputMatch[1].trim();
                    }
                    
                    currentToolUsage = {
                        name: toolName,
                        input: toolInput,
                        output: toolOutput,
                        duration: Date.now() - startTime
                    };
                }

                const lastMessage = result.messages[result.messages.length - 1];
                response = typeof lastMessage.content === 'string' 
                    ? lastMessage.content 
                    : JSON.stringify(lastMessage.content);
            } catch (error) {
                currentToolUsage = {
                    name: 'error',
                    input: message,
                    output: error instanceof Error ? error.message : String(error),
                    duration: Date.now() - startTime
                };
                response = "I apologize, but I encountered an error processing your request. Please try again.";
            }

            // Save messages
            const userMessage = await this.chatRepository.addMessage(
                conversation.id,
                message,
                'user'
            );

            const assistantMessage = await this.chatRepository.addMessage(
                conversation.id,
                response,
                'assistant',
                currentToolUsage
            );

            // Update stats
            if (userId) {
                await this.statsService.updateUserStats(userId, message.length);
                await this.statsService.updateConversationStats(
                    conversation.id,
                    'user',
                    false
                );
                await this.statsService.updateConversationStats(
                    conversation.id,
                    'assistant',
                    !!currentToolUsage
                );
            }

            // Generate and update conversation summary
            const allMessages = [...conversation.messages, userMessage, assistantMessage];
            const summary = await this.conversationService.generateSummary(allMessages);
            await this.conversationService.updateSummary(conversation.id, summary);

            // Update cache
            await this.messageCache.cacheConversationMessages(conversation.id, allMessages);

            // Clear typing indicator
            if (userId && conversationId) {
                await this.sessionCache.clearTypingIndicator(userId, conversationId);
            }

            return { userMessage, assistantMessage };

        } catch (error) {
            broadcastLog('error', `Error processing message: ${error}`);

            // Clear typing indicator on error
            if (userId && conversationId) {
                await this.sessionCache.clearTypingIndicator(userId, conversationId);
            }

            throw error;
        }
    }

    async starMessage(messageId: string, userId: string, note?: string): Promise<void> {
        await this.starsService.starMessage(messageId, userId, note);
    }

    async unstarMessage(messageId: string, userId: string): Promise<void> {
        await this.starsService.unstarMessage(messageId, userId);
    }

    async getStarredMessages(userId: string, options: QueryOptions) {
        const { page, limit, search, sortBy, sortOrder } = options;
        const dbOptions: DatabaseQueryOptions = {
            skip: (page - 1) * limit,
            take: limit,
            search,
            sortBy,
            sortOrder
        };

        // First try to get from cache
        const cacheKey = `starred:${userId}:${page}:${limit}:${search}:${sortBy}:${sortOrder}`;
        const cached = await this.messageCache.getCachedMessages(cacheKey);
        if (cached) {
            return {
                messages: cached,
                hasMore: cached.length === limit,
                total: await this.starsService.getStarredMessagesCount(userId, search)
            };
        }

        // If not in cache, get from database
        const starredMessages = await this.starsService.getStarredMessages(userId, dbOptions);
        const messages: ChatMessage[] = starredMessages.map(sm => ({
            id: sm.message.id,
            created_at: sm.message.created_at,
            updated_at: sm.message.updated_at,
            role: sm.message.role as 'user' | 'assistant',
            content: sm.message.content,
            metadata: sm.message.metadata as Record<string, unknown>,
            conversation_id: sm.message.conversation_id,
            user_id: sm.message.user_id
        }));

        // Cache the results
        await this.messageCache.cacheConversationMessages(cacheKey, messages);

        return {
            messages,
            hasMore: messages.length === limit,
            total: await this.starsService.getStarredMessagesCount(userId, search)
        };
    }

    async archiveConversation(conversationId: string): Promise<void> {
        await this.conversationService.archiveConversation(conversationId);
    }

    async unarchiveConversation(conversationId: string): Promise<void> {
        await this.conversationService.unarchiveConversation(conversationId);
    }

    async getArchivedConversations(userId: string, options: QueryOptions) {
        const { page, limit, search, sortBy, sortOrder } = options;
        const dbOptions: DatabaseQueryOptions = {
            skip: (page - 1) * limit,
            take: limit,
            search,
            sortBy,
            sortOrder
        };

        // First try to get from cache
        const cacheKey = `conversations:archived:${userId}:${page}:${limit}:${search}:${sortBy}:${sortOrder}`;
        const cached = await this.messageCache.getCachedMessages(cacheKey);
        if (cached) {
            return {
                conversations: cached,
                hasMore: cached.length === limit,
                total: await this.conversationService.getArchivedConversationsCount(userId, search)
            };
        }

        // If not in cache, get from database
        const conversations = await this.conversationService.getArchivedConversations(userId, dbOptions);
        const messages: ChatMessage[] = conversations.flatMap(conv => 
            conv.messages.map(msg => ({
                id: msg.id,
                created_at: msg.created_at,
                updated_at: msg.updated_at,
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                metadata: msg.metadata as Record<string, unknown>,
                conversation_id: msg.conversation_id,
                user_id: msg.user_id
            }))
        );

        // Cache the results
        await this.messageCache.cacheConversationMessages(cacheKey, messages);

        return {
            conversations,
            hasMore: conversations.length === limit,
            total: await this.conversationService.getArchivedConversationsCount(userId, search)
        };
    }

    async getActiveConversations(userId: string, options: QueryOptions) {
        const { page, limit, search, sortBy, sortOrder } = options;
        const dbOptions: DatabaseQueryOptions = {
            skip: (page - 1) * limit,
            take: limit,
            search,
            sortBy,
            sortOrder
        };

        // First try to get from cache
        const cacheKey = `conversations:active:${userId}:${page}:${limit}:${search}:${sortBy}:${sortOrder}`;
        const cached = await this.messageCache.getCachedMessages(cacheKey);
        if (cached) {
            return {
                conversations: cached,
                hasMore: cached.length === limit,
                total: await this.conversationService.getActiveConversationsCount(userId, search)
            };
        }

        // If not in cache, get from database
        const conversations = await this.conversationService.getActiveConversations(userId, dbOptions);
        const messages: ChatMessage[] = conversations.flatMap(conv => 
            conv.messages.map(msg => ({
                id: msg.id,
                created_at: msg.created_at,
                updated_at: msg.updated_at,
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                metadata: msg.metadata as Record<string, unknown>,
                conversation_id: msg.conversation_id,
                user_id: msg.user_id
            }))
        );

        // Cache the results
        await this.messageCache.cacheConversationMessages(cacheKey, messages);

        return {
            conversations,
            hasMore: conversations.length === limit,
            total: await this.conversationService.getActiveConversationsCount(userId, search)
        };
    }

    async getUserStats(userId: string) {
        return await this.statsService.getUserStats(userId);
    }

    async getConversationStats(conversationId: string) {
        return await this.statsService.getConversationStats(conversationId);
    }
} 