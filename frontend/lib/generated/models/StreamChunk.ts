/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type StreamChunk = {
    type: StreamChunk.type;
    content: string;
    metadata?: Record<string, any>;
};
export namespace StreamChunk {
    export enum type {
        CHUNK = 'chunk',
        ERROR = 'error',
        DONE = 'done',
    }
}

