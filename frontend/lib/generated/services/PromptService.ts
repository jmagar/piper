/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class PromptService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Enhance a prompt
     * @param requestBody
     * @returns any Enhanced prompt
     * @throws ApiError
     */
    public enhancePrompt(
        requestBody: {
            prompt: string;
            options?: {
                temperature?: number;
                maxTokens?: number;
            };
        },
    ): CancelablePromise<{
        enhancedPrompt?: string;
        explanation?: string;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/prompt/enhance',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
                500: `Error response`,
            },
        });
    }
}
