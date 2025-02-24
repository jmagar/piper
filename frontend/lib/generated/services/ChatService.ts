/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChatMessage } from '../models/ChatMessage';
import type { Conversation } from '../models/Conversation';
import type { ConversationStats } from '../models/ConversationStats';
import type { MessageReaction } from '../models/MessageReaction';
import type { StarredMessage } from '../models/StarredMessage';
import type { UserStats } from '../models/UserStats';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ChatService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get messages
     * @param conversationId
     * @param cursor
     * @param limit
     * @param search
     * @param threadId
     * @returns any List of messages
     * @throws ApiError
     */
    public getMessages(
        conversationId?: string,
        cursor?: string,
        limit: number = 20,
        search?: string,
        threadId?: string,
    ): CancelablePromise<{
        messages?: Array<ChatMessage>;
        nextCursor?: string;
        total?: number;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/chat',
            query: {
                'conversationId': conversationId,
                'cursor': cursor,
                'limit': limit,
                'search': search,
                'threadId': threadId,
            },
            errors: {
                500: `Error response`,
            },
        });
    }
    /**
     * Create message
     * @param requestBody
     * @returns ChatMessage Message created
     * @throws ApiError
     */
    public createMessage(
        requestBody: {
            content: string;
            userId: string;
            username: string;
            conversationId?: string;
            parentId?: string;
            type?: 'text' | 'code' | 'system';
            metadata?: Record<string, any>;
        },
    ): CancelablePromise<ChatMessage> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/chat',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Get user conversations
     * @param userId
     * @returns Conversation List of conversations
     * @throws ApiError
     */
    public getUserConversations(
        userId: string,
    ): CancelablePromise<Array<Conversation>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/chat/conversations/{userId}',
            path: {
                'userId': userId,
            },
            errors: {
                404: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Star a message
     * @param requestBody
     * @returns StarredMessage Message starred
     * @throws ApiError
     */
    public starMessage(
        requestBody: {
            messageId: string;
            userId: string;
            note?: string;
        },
    ): CancelablePromise<StarredMessage> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/chat/messages/star',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Unstar a message
     * @param requestBody
     * @returns any Message unstarred
     * @throws ApiError
     */
    public unstarMessage(
        requestBody: {
            messageId: string;
            userId: string;
        },
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/chat/messages/unstar',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Get chat statistics
     * @param userId
     * @param conversationId
     * @returns any Chat statistics
     * @throws ApiError
     */
    public getChatStats(
        userId?: string,
        conversationId?: string,
    ): CancelablePromise<(UserStats | ConversationStats)> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/chat/stats',
            query: {
                'userId': userId,
                'conversationId': conversationId,
            },
            errors: {
                404: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Add a reaction to a message
     * @param messageId
     * @param requestBody
     * @returns MessageReaction Reaction added
     * @throws ApiError
     */
    public addMessageReaction(
        messageId: string,
        requestBody: {
            emoji: string;
            userId: string;
            username: string;
        },
    ): CancelablePromise<MessageReaction> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/chat/messages/{messageId}/reactions',
            path: {
                'messageId': messageId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
                500: `Error response`,
            },
        });
    }
}
