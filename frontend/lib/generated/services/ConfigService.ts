/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ConfigService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get server configuration
     * @returns any Server configuration
     * @throws ApiError
     */
    public getConfig(): CancelablePromise<{
        version?: string;
        features?: Record<string, boolean>;
        limits?: {
            maxMessageLength?: number;
            maxFileSize?: number;
            maxFilesPerMessage?: number;
        };
        providers?: {
            openai?: boolean;
            anthropic?: boolean;
            groq?: boolean;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/config',
            errors: {
                500: `Error response`,
            },
        });
    }
    /**
     * Update server configuration
     * @param requestBody
     * @returns any Configuration updated
     * @throws ApiError
     */
    public updateConfig(
        requestBody: {
            features?: Record<string, boolean>;
            limits?: {
                maxMessageLength?: number;
                maxFileSize?: number;
                maxFilesPerMessage?: number;
            };
            providers?: {
                openai?: boolean;
                anthropic?: boolean;
                groq?: boolean;
            };
        },
    ): CancelablePromise<{
        success?: boolean;
    }> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/api/config',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
                500: `Error response`,
            },
        });
    }
}
