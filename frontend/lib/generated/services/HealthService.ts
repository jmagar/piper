/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class HealthService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Health check endpoint
     * Check if the API is running
     * @returns any API is healthy
     * @throws ApiError
     */
    public getApiHealth(): CancelablePromise<{
        status?: string;
        version?: string;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/health',
        });
    }
}
