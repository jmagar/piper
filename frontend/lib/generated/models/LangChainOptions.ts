/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type LangChainOptions = {
    streaming?: boolean;
    memory?: boolean;
    memorySize?: number;
    fallbackProvider?: LangChainOptions.fallbackProvider;
};
export namespace LangChainOptions {
    export enum fallbackProvider {
        OPENAI = 'openai',
        ANTHROPIC = 'anthropic',
    }
}

