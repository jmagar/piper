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
     * Retrieve application configuration
     * @returns any Configuration retrieved successfully
     * @throws ApiError
     */
    public getApiConfig(): CancelablePromise<Record<string, any>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/config',
        });
    }
    /**
     * Update configuration
     * Update application configuration
     * @param requestBody
     * @returns any Configuration updated successfully
     * @throws ApiError
     */
    public putApiConfig(
        requestBody: Record<string, any>,
    ): CancelablePromise<Record<string, any>> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/api/config',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
