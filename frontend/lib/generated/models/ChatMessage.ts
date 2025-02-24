/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ChatMessage = {
    id: string;
    content: string;
    role: ChatMessage.role;
    type?: ChatMessage.type;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, any>;
    status?: ChatMessage.status;
};
export namespace ChatMessage {
    export enum role {
        USER = 'user',
        ASSISTANT = 'assistant',
        SYSTEM = 'system',
    }
    export enum type {
        TEXT = 'text',
        CODE = 'code',
        SYSTEM = 'system',
    }
    export enum status {
        SENDING = 'sending',
        DELIVERED = 'delivered',
        ERROR = 'error',
    }
}

