/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Tool } from '../models/Tool';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class McpService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get available tools
     * @returns Tool List of available tools
     * @throws ApiError
     */
    public getTools(): CancelablePromise<Array<Tool>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/mcp/tools',
            errors: {
                500: `Error response`,
            },
        });
    }
    /**
     * Register a new tool
     * @param requestBody
     * @returns Tool Tool registered
     * @throws ApiError
     */
    public registerTool(
        requestBody: Tool,
    ): CancelablePromise<Tool> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/mcp/tools',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Get tool by ID
     * @param toolId
     * @returns Tool Tool details
     * @throws ApiError
     */
    public getTool(
        toolId: string,
    ): CancelablePromise<Tool> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/mcp/tools/{toolId}',
            path: {
                'toolId': toolId,
            },
            errors: {
                404: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Update tool
     * @param toolId
     * @param requestBody
     * @returns Tool Tool updated
     * @throws ApiError
     */
    public updateTool(
        toolId: string,
        requestBody: Tool,
    ): CancelablePromise<Tool> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/api/mcp/tools/{toolId}',
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
    /**
     * Delete tool
     * @param toolId
     * @returns void
     * @throws ApiError
     */
    public deleteTool(
        toolId: string,
    ): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/api/mcp/tools/{toolId}',
            path: {
                'toolId': toolId,
            },
            errors: {
                404: `Error response`,
                500: `Error response`,
            },
        });
    }
}
