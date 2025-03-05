/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SystemService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * System status
     * Check the status of all system services
     * @returns any System status information
     * @throws ApiError
     */
    public getApiSystemStatus(): CancelablePromise<{
        /**
         * Status check timestamp
         */
        timestamp?: string;
        services?: {
            qdrant?: {
                /**
                 * Status of the Qdrant connection
                 */
                status?: 'healthy' | 'error' | 'unavailable';
                /**
                 * Additional details about the Qdrant connection
                 */
                details?: Record<string, any> | null;
                /**
                 * Error message if status is 'error'
                 */
                error?: string | null;
            };
            openai?: {
                /**
                 * Status of the OpenAI connection
                 */
                status?: 'healthy' | 'error' | 'unavailable';
                /**
                 * Additional details about the OpenAI connection
                 */
                details?: Record<string, any> | null;
                /**
                 * Error message if status is 'error'
                 */
                error?: string | null;
            };
        };
        environment?: {
            /**
             * Node.js version
             */
            node_version?: string;
            /**
             * Next.js version
             */
            nextjs_version?: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/system/status',
            errors: {
                500: `Error response`,
            },
        });
    }
    /**
     * Test Qdrant connection
     * Test the connection to the Qdrant vector database
     * @returns any Connection test result
     * @throws ApiError
     */
    public getApiSystemTestQdrant(): CancelablePromise<{
        status?: 'connected' | 'error';
        message?: string;
        collections?: Array<string>;
        timestamp?: string;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/system/test-qdrant',
            errors: {
                500: `Error response`,
            },
        });
    }
    /**
     * Test OpenAI connection
     * Test the connection to the OpenAI API
     * @returns any Connection test result
     * @throws ApiError
     */
    public getApiSystemTestOpenai(): CancelablePromise<{
        status?: 'connected' | 'error';
        message?: string;
        models?: Array<string>;
        embeddingModel?: string;
        timestamp?: string;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/system/test-openai',
            errors: {
                500: `Error response`,
            },
        });
    }
}
