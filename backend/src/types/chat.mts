import type { Prisma } from '@prisma/client';

export type MessageType = 'text' | 'code' | 'system' | 'file-list' | 'stream-chunk';
export type MessageStatus = 'sending' | 'streaming' | 'sent' | 'error';
export type StreamStatus = 'streaming' | 'complete' | 'error';

export interface StreamingOptions {
  onChunk: (chunk: string) => void | Promise<void>;
  onError: (error: Error) => void | Promise<void>;
  onComplete: () => void | Promise<void>;
  maxTokens?: number;
  chunkSize?: number;
  timeout?: number;
}

export interface StreamingMetadataFields {
  streamStatus: StreamStatus;
  streamId: string;
  streamIndex?: number;
  isPartial: boolean;
  chunkCount: number;
  totalLength: number;
  streamStartTime: string;
  streamEndTime?: string;
  streamDuration?: number;
  error?: string;
  errorCode?: string;
  errorStack?: string;
  type?: MessageType;
  timestamp?: string | number;
}

export interface ChatMetadataFields extends Partial<StreamingMetadataFields> {
  edited?: boolean;
  editedAt?: string;
  errorMessage?: string;
  reactions?: {
    [emoji: string]: {
      count: number;
      users: {
        id: string;
        name: string;
      }[];
    };
  };
  hasThread?: boolean;
  replyCount?: number;
  lastReplyAt?: string;
  bookmarked?: boolean;
  threadSummary?: string;
  toolUsed?: {
    name: string;
    icon?: string;
    status: 'success' | 'error' | 'running';
  };
}

export type ChatMetadata = Prisma.JsonObject;

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  type?: MessageType;
  conversationId?: string;
  userId?: string;
  username?: string;
  parentId?: string;
  threadSummary?: string;
  metadata?: ChatMetadata;
  createdAt: Date;
  updatedAt?: Date;
}

export function createMetadata(metadata: Partial<ChatMetadataFields>): Prisma.JsonObject {
  const base = {
    timestamp: new Date().toISOString(),
    ...metadata
  };

  // Ensure all values are JSON-serializable
  return JSON.parse(JSON.stringify(base)) as Prisma.JsonObject;
}

export function createStreamingMetadata(
  streamId: string,
  status: StreamStatus,
  options?: Partial<StreamingMetadataFields>
): Prisma.JsonObject {
  const metadata = {
    streamStatus: status,
    streamId,
    isPartial: status === 'streaming',
    chunkCount: 0,
    totalLength: 0,
    streamStartTime: new Date().toISOString(),
    ...(options ?? {})
  };

  // Ensure all values are JSON-serializable
  return JSON.parse(JSON.stringify(metadata)) as Prisma.JsonObject;
}

// Helper function to ensure metadata is a valid JsonObject
export function ensureJsonObject(obj: unknown): Prisma.JsonObject {
  if (typeof obj !== 'object' || obj === null) {
    return {};
  }
  return JSON.parse(JSON.stringify(obj)) as Prisma.JsonObject;
}
