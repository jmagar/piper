import { HumanMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { broadcastLog } from '../../utils/logger.js';
import { Agent } from '../../types/index.js';
import { ChatRepository } from './chat.repository.js';
import { MessageCacheService } from '../../services/cache/message.cache.js';
import { ToolCacheService } from '../../services/cache/tool.cache.js';
import { SessionCacheService } from '../../services/cache/session.cache.js';
import type { ToolUsage } from './chat.types.js';

export class ChatService {
    constructor(
        private readonly agent: Agent,
        private readonly chatRepository: ChatRepository,
        private readonly messageCache: MessageCacheService,
        private readonly toolCache: ToolCacheService,
        private readonly sessionCache: SessionCacheService
    ) {}

    async processMessage(
        message: string,
        conversationId?: string,
        userId?: string
    ): Promise<string> {
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
                    // Since tool message type is internal to LangChain, we need to access properties carefully
                    const toolMessage = toolMessages[0];
                    const toolContent = toolMessage.content;
                    
                    // Parse tool content assuming it contains the required fields
                    let toolName = 'unknown';
                    let toolInput = '';
                    let toolOutput = '';
                    
                    if (typeof toolContent === 'string') {
                        // Try to extract tool info from content
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
                // Handle error case
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
                response as string,
                'assistant',
                currentToolUsage
            );

            // Update cache
            const updatedMessages = [...conversation.messages, userMessage, assistantMessage];
            await this.messageCache.cacheConversationMessages(conversation.id, updatedMessages);

            // Clear typing indicator
            if (userId && conversationId) {
                await this.sessionCache.clearTypingIndicator(userId, conversationId);
            }

            return response as string;

        } catch (error) {
            broadcastLog('error', `Error processing message: ${error}`);

            // Clear typing indicator on error
            if (userId && conversationId) {
                await this.sessionCache.clearTypingIndicator(userId, conversationId);
            }

            throw error;
        }
    }
} 