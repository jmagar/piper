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
     * Returns the health status of the API
     * @returns any API is healthy
     * @throws ApiError
     */
    public getHealth(): CancelablePromise<{
        status: 'ok';
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/health',
        });
    }
}
