import type { Prisma } from '@prisma/client';

export type MessageType = 'text' | 'code' | 'system' | 'file-list';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  userId: string;
  username: string;
  conversationId?: string;
  parentId?: string;
  type?: MessageType;
  metadata?: Prisma.InputJsonValue;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ChatResponse {
  message: ChatMessage;
  error?: string;
}

export interface ChatOptions {
  streaming?: boolean;
  memory?: boolean;
  memorySize?: number;
  fallbackProvider?: 'openai' | 'anthropic';
}

export interface ChatMetadata {
  type?: MessageType;
  timestamp?: string;
  error?: string;
  errorMessage?: string;
  [key: string]: unknown;
}

// Helper to ensure metadata is Prisma JSON-compatible
export function createMetadata(data: ChatMetadata): Prisma.InputJsonValue {
  // Convert to plain object and remove any undefined values
  const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, unknown>);
  
  return cleanData as Prisma.InputJsonValue;
}