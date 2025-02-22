/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ChatMessage = {
    id: string;
    content: string;
    role: ChatMessage.role;
    userId: string;
    username: string;
    conversationId?: string;
    parentId?: string;
    type?: ChatMessage.type;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt?: string;
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
}

