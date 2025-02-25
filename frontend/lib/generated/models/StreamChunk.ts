/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type StreamChunk = {
  type: 'chunk' | 'error' | 'done';
  content: string;
  metadata?: Record<string, any>;
};

