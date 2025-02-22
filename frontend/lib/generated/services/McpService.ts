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
     * Get MCP server health status
     * @returns any Health status of MCP servers
     * @throws ApiError
     */
    public getMcpHealth(): CancelablePromise<{
        status?: 'ok' | 'degraded' | 'error';
        servers?: Array<{
            name?: string;
            status?: 'ok' | 'error';
            error?: string;
            memoryUsage?: {
                heapUsed?: number;
                heapTotal?: number;
                external?: number;
                rss?: number;
            };
        }>;
        timestamp?: string;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/mcp/health',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * List MCP tools
     * @returns Tool List of MCP tools
     * @throws ApiError
     */
    public listMcpTools(): CancelablePromise<Array<Tool>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/mcp/tools',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Register MCP tool
     * @param requestBody
     * @returns Tool MCP tool registered
     * @throws ApiError
     */
    public registerMcpTool(
        requestBody: {
            name: string;
            description?: string;
            serverId: string;
            type?: 'system' | 'plugin' | 'custom';
            parameters?: Array<{
                name: string;
                type: string;
                description?: string;
                required?: boolean;
                schema?: Record<string, any>;
            }>;
            metadata?: Record<string, any>;
        },
    ): CancelablePromise<Tool> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/mcp/tools',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get MCP tool details
     * @param toolId
     * @returns Tool MCP tool details
     * @throws ApiError
     */
    public getMcpTool(
        toolId: string,
    ): CancelablePromise<Tool> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/mcp/tools/{toolId}',
            path: {
                'toolId': toolId,
            },
            errors: {
                404: `Tool not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Unregister MCP tool
     * @param toolId
     * @returns void
     * @throws ApiError
     */
    public unregisterMcpTool(
        toolId: string,
    ): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/mcp/tools/{toolId}',
            path: {
                'toolId': toolId,
            },
            errors: {
                404: `Tool not found`,
                500: `Internal server error`,
            },
        });
    }
}
