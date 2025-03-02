/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class PromptService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Enhance prompt
     * Enhance a user prompt
     * @param requestBody
     * @returns any Prompt enhanced successfully
     * @throws ApiError
     */
    public postApiPromptEnhance(
        requestBody: {
            prompt: string;
            options?: Record<string, any>;
        },
    ): CancelablePromise<{
        enhancedPrompt?: string;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/prompt/enhance',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
