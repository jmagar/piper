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
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ChatService {
  /**
   * Get messages
   * @returns any List of messages
   * @throws ApiError
   */
  public static getMessages({
    conversationId,
    cursor,
    limit = 20,
    search,
    threadId,
  }: {
    conversationId?: string,
    cursor?: string,
    limit?: number,
    search?: string,
    threadId?: string,
  }): CancelablePromise<{
    messages?: Array<ChatMessage>;
    nextCursor?: string;
    total?: number;
  }> {
    return __request(OpenAPI, {
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
   * @returns ChatMessage Message created
   * @throws ApiError
   */
  public static createMessage({
    requestBody,
  }: {
    requestBody: {
      content: string;
      userId: string;
      username: string;
      conversationId?: string;
      parentId?: string;
      type?: 'text' | 'code' | 'system';
      metadata?: Record<string, any>;
    },
  }): CancelablePromise<ChatMessage> {
    return __request(OpenAPI, {
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
   * @returns Conversation List of conversations
   * @throws ApiError
   */
  public static getUserConversations({
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
      errors: {
        404: `Error response`,
        500: `Error response`,
      },
    });
  }
  /**
   * Star a message
   * @returns StarredMessage Message starred
   * @throws ApiError
   */
  public static starMessage({
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
      errors: {
        400: `Error response`,
        500: `Error response`,
      },
    });
  }
  /**
   * Unstar a message
   * @returns any Message unstarred
   * @throws ApiError
   */
  public static unstarMessage({
    requestBody,
  }: {
    requestBody: {
      messageId: string;
      userId: string;
    },
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
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
   * @returns any Chat statistics
   * @throws ApiError
   */
  public static getChatStats({
    userId,
    conversationId,
  }: {
    userId?: string,
    conversationId?: string,
  }): CancelablePromise<(UserStats | ConversationStats)> {
    return __request(OpenAPI, {
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
   * @returns MessageReaction Reaction added
   * @throws ApiError
   */
  public static addMessageReaction({
    messageId,
    requestBody,
  }: {
    messageId: string,
    requestBody: {
      emoji: string;
      userId: string;
      username: string;
    },
  }): CancelablePromise<MessageReaction> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/chat/messages/{messageId}/reactions',
      path: {
        'messageId': messageId,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Error response`,
        404: `Error response`,
        500: `Error response`,
      },
    });
  }
  /**
   * Remove a reaction from a message
   * @returns any Reaction removed
   * @throws ApiError
   */
  public static removeMessageReaction({
    messageId,
    emoji,
    userId,
  }: {
    messageId: string,
    emoji: string,
    userId: string,
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/chat/messages/{messageId}/reactions',
      path: {
        'messageId': messageId,
      },
      query: {
        'emoji': emoji,
        'userId': userId,
      },
      errors: {
        404: `Error response`,
        500: `Error response`,
      },
    });
  }
  /**
   * Get thread messages
   * @returns any List of thread messages
   * @throws ApiError
   */
  public static getThreadMessages({
    messageId,
    cursor,
    limit = 20,
  }: {
    messageId: string,
    cursor?: string,
    limit?: number,
  }): CancelablePromise<{
    messages?: Array<ChatMessage>;
    nextCursor?: string;
    total?: number;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/chat/messages/{messageId}/thread',
      path: {
        'messageId': messageId,
      },
      query: {
        'cursor': cursor,
        'limit': limit,
      },
      errors: {
        404: `Error response`,
        500: `Error response`,
      },
    });
  }
  /**
   * Edit a message
   * @returns ChatMessage Message updated
   * @throws ApiError
   */
  public static editMessage({
    messageId,
    requestBody,
  }: {
    messageId: string,
    requestBody: {
      content: string;
      userId: string;
      metadata?: Record<string, any>;
    },
  }): CancelablePromise<ChatMessage> {
    return __request(OpenAPI, {
      method: 'PATCH',
      url: '/api/chat/messages/{messageId}',
      path: {
        'messageId': messageId,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Error response`,
        403: `Error response`,
        404: `Error response`,
        500: `Error response`,
      },
    });
  }
  /**
   * Delete a message
   * @returns any Message deleted
   * @throws ApiError
   */
  public static deleteMessage({
    messageId,
    userId,
  }: {
    messageId: string,
    userId: string,
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/chat/messages/{messageId}',
      path: {
        'messageId': messageId,
      },
      query: {
        'userId': userId,
      },
      errors: {
        403: `Error response`,
        404: `Error response`,
        500: `Error response`,
      },
    });
  }
}
