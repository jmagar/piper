/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChatMessageMetadata } from './ChatMessageMetadata';
import type { ChatMessageType } from './ChatMessageType';
export type ChatMessage = {
    id: string;
    content: string;
    role: ChatMessage.role;
    type?: ChatMessageType;
    createdAt: string;
    updatedAt: string;
    metadata?: ChatMessageMetadata;
    status?: ChatMessage.status;
};
export namespace ChatMessage {
    export enum role {
        USER = 'user',
        ASSISTANT = 'assistant',
        SYSTEM = 'system',
    }
    export enum status {
        SENDING = 'sending',
        STREAMING = 'streaming',
        SENT = 'sent',
        ERROR = 'error',
    }
}

