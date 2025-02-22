/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ConfigService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get configuration
     * @returns any Configuration object
     * @throws ApiError
     */
    public getConfig(): CancelablePromise<{
        models?: Array<{
            id?: string;
            name?: string;
            provider?: string;
            contextWindow?: number;
            maxTokens?: number;
            temperature?: number;
            topP?: number;
            frequencyPenalty?: number;
            presencePenalty?: number;
            stopSequences?: Array<string>;
        }>;
        defaultModel?: string;
        maxContextLength?: number;
        maxResponseTokens?: number;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/config',
            errors: {
                500: `Error response`,
            },
        });
    }
}
