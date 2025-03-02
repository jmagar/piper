/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChatMessage } from '../models/ChatMessage';
import type { Conversation } from '../models/Conversation';
import type { StarredMessage } from '../models/StarredMessage';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ChatService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get chat messages
     * Retrieve chat messages
     * @returns ChatMessage Chat messages retrieved successfully
     * @throws ApiError
     */
    public getApiChat(): CancelablePromise<Array<ChatMessage>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/chat',
        });
    }
    /**
     * Send a chat message
     * Send a new chat message
     * @param requestBody
     * @returns ChatMessage Chat message sent successfully
     * @throws ApiError
     */
    public postApiChat(
        requestBody: {
            content: string;
            userId: string;
            conversationId?: string;
        },
    ): CancelablePromise<ChatMessage> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/chat',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get user conversations
     * Retrieve conversations for a specific user
     * @param userId
     * @returns Conversation User conversations retrieved successfully
     * @throws ApiError
     */
    public getApiChatConversations(
        userId: string,
    ): CancelablePromise<Array<Conversation>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/chat/conversations/{userId}',
            path: {
                'userId': userId,
            },
        });
    }
    /**
     * Star a message
     * Mark a message as starred
     * @param requestBody
     * @returns StarredMessage Message starred successfully
     * @throws ApiError
     */
    public postApiChatMessagesStar(
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
        });
    }
    /**
     * Unstar a message
     * Remove star from a message
     * @param requestBody
     * @returns any Message unstarred successfully
     * @throws ApiError
     */
    public postApiChatMessagesUnstar(
        requestBody: {
            messageId: string;
            userId: string;
        },
    ): CancelablePromise<{
        success?: boolean;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/chat/messages/unstar',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
