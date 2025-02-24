/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Tool } from '../models/Tool';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ToolsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get available tools
     * @returns Tool List of available tools
     * @throws ApiError
     */
    public getAvailableTools(): CancelablePromise<Array<Tool>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/tools',
            errors: {
                500: `Error response`,
            },
        });
    }
    /**
     * Invoke a tool
     * @param toolId
     * @param requestBody
     * @returns any Tool invocation result
     * @throws ApiError
     */
    public invokeTool(
        toolId: string,
        requestBody: {
            parameters: Record<string, any>;
        },
    ): CancelablePromise<{
        result?: Record<string, any>;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/tools/{toolId}/invoke',
            path: {
                'toolId': toolId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
                404: `Error response`,
                500: `Error response`,
            },
        });
    }
}
