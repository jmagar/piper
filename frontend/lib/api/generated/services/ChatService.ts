/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChatMessage } from '../models/ChatMessage';
import type { Conversation } from '../models/Conversation';
import type { StarredMessage } from '../models/StarredMessage';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ChatService {
  /**
   * Get chat messages
   * Retrieve chat messages
   * @returns ChatMessage Chat messages retrieved successfully
   * @throws ApiError
   */
  public static getApiChat(): CancelablePromise<Array<ChatMessage>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/chat',
    });
  }
  /**
   * Send a chat message
   * Send a new chat message
   * @returns ChatMessage Chat message sent successfully
   * @throws ApiError
   */
  public static postApiChat({
    requestBody,
  }: {
    requestBody: {
      content: string;
      userId: string;
      conversationId?: string;
    },
  }): CancelablePromise<ChatMessage> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/chat',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Get user conversations
   * Retrieve conversations for a specific user
   * @returns Conversation User conversations retrieved successfully
   * @throws ApiError
   */
  public static getApiChatConversations({
    userId,
  }: {
    userId: string,
  }): CancelablePromise<Array<Conversation>> {
    return __request(OpenAPI, {
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
   * @returns StarredMessage Message starred successfully
   * @throws ApiError
   */
  public static postApiChatMessagesStar({
    requestBody,
  }: {
    requestBody: {
      messageId: string;
      userId: string;
      note?: string;
    },
  }): CancelablePromise<StarredMessage> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/chat/messages/star',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Unstar a message
   * Remove star from a message
   * @returns any Message unstarred successfully
   * @throws ApiError
   */
  public static postApiChatMessagesUnstar({
    requestBody,
  }: {
    requestBody: {
      messageId: string;
      userId: string;
    },
  }): CancelablePromise<{
    success?: boolean;
  }> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/chat/messages/unstar',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
}
