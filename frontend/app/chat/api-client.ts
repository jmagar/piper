import { z } from "zod";

// Configuration constants
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100";
export const DEFAULT_USER_ID = "admin"; // This should be a valid user ID in the database

// Type definitions
export interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  userId: string;
  username?: string;
  conversationId?: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  metadata: {
    summary?: string;
    messageCount: number;
    userMessageCount: number;
    botMessageCount: number;
    toolUsageCount: number;
    lastMessage?: string;
  };
}

// Validation schemas
export const messageSchema = z.object({
  content: z.string().min(1, "Message content is required"),
  userId: z.string().min(1, "User ID is required"),
  conversationId: z.string().optional(),
});

// Custom error class
export class ChatApiError extends Error {
  status: number;
  
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = "ChatApiError";
    this.status = status;
  }
}

/**
 * ChatApi class for handling chat-related API requests
 */
export class ChatApi {
  private baseUrl: string;
  private headers: Record<string, string>;
  private userId: string;
  
  /**
   * Creates a new ChatApi instance
   * @param userId - User ID to use for API requests
   * @param baseUrl - API base URL (defaults to configuration)
   */
  constructor(userId: string = DEFAULT_USER_ID, baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.userId = userId;
    this.headers = {
      "Content-Type": "application/json",
    };
  }
  
  /**
   * Makes an API request with proper error handling
   * @param endpoint - API endpoint to call
   * @param options - Request options
   * @returns Response data
   */
  private async request<T>(
    endpoint: string, 
    options: {
      method?: string;
      body?: string | null;
      headers?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      // Directly use fetch with simplified options
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          ...this.headers,
          ...(options.headers || {})
        },
        body: options.body || null,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new ChatApiError(
          errorData.error || `API request failed with status ${response.status}`,
          response.status
        );
      }
      
      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof ChatApiError) {
        throw error;
      }
      
      throw new ChatApiError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  }
  
  /**
   * Gets messages for a conversation
   * @param conversationId - ID of the conversation
   * @param options - Additional options like cursor, limit, search
   * @returns Messages and pagination data
   */
  async getMessages(
    conversationId: string,
    options: {
      cursor?: string;
      limit?: number;
      search?: string;
      threadId?: string;
    } = {}
  ) {
    const queryParams = new URLSearchParams();
    
    if (conversationId) {
      queryParams.append("conversationId", conversationId);
    }
    
    if (options.cursor) {
      queryParams.append("cursor", options.cursor);
    }
    
    if (options.limit) {
      queryParams.append("limit", options.limit.toString());
    }
    
    if (options.search) {
      queryParams.append("search", options.search);
    }
    
    if (options.threadId) {
      queryParams.append("threadId", options.threadId);
    }
    
    const endpoint = `/api/chat?${queryParams.toString()}`;
    return this.request<{
      messages: ChatMessage[];
      nextCursor: string | null;
      total: number;
    }>(endpoint);
  }
  
  /**
   * Creates a new message in a conversation
   * @param content - Message content
   * @param conversationId - Optional ID of the conversation (creates new if not provided)
   * @returns Created message
   */
  async createMessage(
    content: string,
    conversationId?: string
  ): Promise<ChatMessage> {
    const validation = messageSchema.safeParse({
      content,
      userId: this.userId,
      conversationId,
    });
    
    if (!validation.success) {
      throw new ChatApiError(validation.error.message);
    }
    
    return this.request<ChatMessage>("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        content,
        userId: this.userId,
        conversationId,
      }),
    });
  }
  
  /**
   * Gets conversations for the current user
   * @returns List of user conversations
   */
  async getUserConversations(): Promise<ChatConversation[]> {
    return this.request<ChatConversation[]>(`/api/chat/conversations/${this.userId}`);
  }
  
  /**
   * Stars a message
   * @param messageId - ID of the message to star
   * @param note - Optional note to add to the starred message
   * @returns Success response
   */
  async starMessage(messageId: string, note?: string) {
    return this.request<{ id: string }>("/api/chat/messages/star", {
      method: "POST",
      body: JSON.stringify({
        messageId,
        userId: this.userId,
        note,
      }),
    });
  }
  
  /**
   * Unstars a message
   * @param messageId - ID of the message to unstar
   * @returns Success response
   */
  async unstarMessage(messageId: string) {
    return this.request<{ success: boolean }>("/api/chat/messages/unstar", {
      method: "POST",
      body: JSON.stringify({
        messageId,
        userId: this.userId,
      }),
    });
  }
}

// Singleton chat api instance
let chatApiInstance: ChatApi | null = null;

/**
 * Gets or creates a ChatApi instance
 * @param userId - Optional user ID override
 * @returns ChatApi instance
 */
export function getChatApi(userId: string = DEFAULT_USER_ID): ChatApi {
  if (!chatApiInstance || userId !== DEFAULT_USER_ID) {
    chatApiInstance = new ChatApi(userId);
  }
  return chatApiInstance;
} 