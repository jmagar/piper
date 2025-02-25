/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChatMessageMetadata } from './ChatMessageMetadata';
import type { ChatMessageType } from './ChatMessageType';
export type ChatMessage = {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  type?: ChatMessageType;
  createdAt: string;
  updatedAt: string;
  metadata?: ChatMessageMetadata;
  status?: 'sending' | 'streaming' | 'sent' | 'error';
};

