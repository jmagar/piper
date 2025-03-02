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
     * Get MCP servers
     * Retrieve list of MCP servers
     * @returns any MCP servers retrieved successfully
     * @throws ApiError
     */
    public getApiMcpServers(): CancelablePromise<Array<Record<string, any>>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/mcp/servers',
            errors: {
                500: `Error response`,
            },
        });
    }
    /**
     * Create MCP server
     * Create a new MCP server
     * @param requestBody
     * @returns any MCP server created successfully
     * @throws ApiError
     */
    public postApiMcpServers(
        requestBody: {
            name: string;
            type: string;
            url: string;
            metadata?: Record<string, any>;
        },
    ): CancelablePromise<Record<string, any>> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/mcp/servers',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Get MCP server details
     * Retrieve details for a specific MCP server
     * @param serverId
     * @returns any MCP server details retrieved successfully
     * @throws ApiError
     */
    public getApiMcpServers1(
        serverId: string,
    ): CancelablePromise<Record<string, any>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/mcp/servers/{serverId}',
            path: {
                'serverId': serverId,
            },
            errors: {
                404: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Delete MCP server
     * Delete a specific MCP server
     * @param serverId
     * @returns void
     * @throws ApiError
     */
    public deleteApiMcpServers(
        serverId: string,
    ): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/api/mcp/servers/{serverId}',
            path: {
                'serverId': serverId,
            },
            errors: {
                404: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Get MCP tools
     * Retrieve list of MCP tools
     * @returns Tool MCP tools retrieved successfully
     * @throws ApiError
     */
    public getApiMcpTools(): CancelablePromise<Array<Tool>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/mcp/tools',
            errors: {
                500: `Error response`,
            },
        });
    }
    /**
     * Create MCP tool
     * Create a new MCP tool
     * @param requestBody
     * @returns Tool MCP tool created successfully
     * @throws ApiError
     */
    public postApiMcpTools(
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
     * Get MCP tool
     * Get a specific MCP tool by ID
     * @param toolId
     * @returns Tool MCP tool retrieved successfully
     * @throws ApiError
     */
    public getApiMcpTools1(
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
     * Update MCP tool
     * Update a specific MCP tool
     * @param toolId
     * @param requestBody
     * @returns Tool MCP tool updated successfully
     * @throws ApiError
     */
    public putApiMcpTools(
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
     * Delete MCP tool
     * Delete a specific MCP tool
     * @param toolId
     * @returns void
     * @throws ApiError
     */
    public deleteApiMcpTools(
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
    /**
     * Execute MCP tool
     * Execute a specific MCP tool
     * @param name
     * @param requestBody
     * @returns any Tool executed successfully
     * @throws ApiError
     */
    public postApiMcpToolsExecute(
        name: string,
        requestBody: {
            params?: Record<string, any>;
            serverId?: string;
        },
    ): CancelablePromise<Record<string, any>> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/mcp/tools/{name}/execute',
            path: {
                'name': name,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * MCP health check
     * Check if MCP is healthy
     * @returns any MCP is healthy
     * @throws ApiError
     */
    public getApiMcpHealth(): CancelablePromise<{
        status?: string;
        version?: string;
        uptime?: number;
        memoryUsage?: {
            total?: number;
            used?: number;
            free?: number;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/mcp/health',
            errors: {
                500: `Error response`,
            },
        });
    }
    /**
     * Get MCP configuration
     * Retrieve MCP configuration
     * @returns any MCP configuration retrieved successfully
     * @throws ApiError
     */
    public getApiMcpConfig(): CancelablePromise<Record<string, any>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/mcp/config',
            errors: {
                404: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Update MCP configuration
     * Update MCP configuration
     * @param requestBody
     * @param createBackup Whether to create a backup of the current configuration before updating
     * @returns any MCP configuration updated successfully
     * @throws ApiError
     */
    public putApiMcpConfig(
        requestBody: Record<string, any>,
        createBackup: boolean = true,
    ): CancelablePromise<{
        success?: boolean;
        backupCreated?: boolean;
        backupPath?: string;
    }> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/api/mcp/config',
            query: {
                'createBackup': createBackup,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Get configuration backups
     * Get a list of MCP configuration backups
     * @returns any Configuration backups retrieved successfully
     * @throws ApiError
     */
    public getApiMcpConfigBackup(): CancelablePromise<{
        backups?: Array<{
            id?: string;
            timestamp?: string;
            path?: string;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/mcp/config/backup',
            errors: {
                500: `Error response`,
            },
        });
    }
    /**
     * Create backup
     * Create a backup of the current MCP configuration
     * @returns any Configuration backup created successfully
     * @throws ApiError
     */
    public postApiMcpConfigBackup(): CancelablePromise<{
        success?: boolean;
        backupPath?: string;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/mcp/config/backup',
            errors: {
                404: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Get backup
     * Get a specific MCP configuration backup
     * @param backupId
     * @returns any Configuration backup retrieved successfully
     * @throws ApiError
     */
    public getApiMcpConfigBackup1(
        backupId: string,
    ): CancelablePromise<Record<string, any>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/mcp/config/backup/{backupId}',
            path: {
                'backupId': backupId,
            },
            errors: {
                404: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Restore backup
     * Restore a specific MCP configuration backup
     * @param backupId
     * @param createBackup Whether to create a backup of the current configuration before restoring
     * @returns any Configuration backup restored successfully
     * @throws ApiError
     */
    public postApiMcpConfigBackup1(
        backupId: string,
        createBackup: boolean = true,
    ): CancelablePromise<{
        success?: boolean;
        backupCreated?: boolean;
        backupPath?: string;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/mcp/config/backup/{backupId}',
            path: {
                'backupId': backupId,
            },
            query: {
                'createBackup': createBackup,
            },
            errors: {
                404: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Delete backup
     * Delete a specific MCP configuration backup
     * @param backupId
     * @returns any Configuration backup deleted successfully
     * @throws ApiError
     */
    public deleteApiMcpConfigBackup(
        backupId: string,
    ): CancelablePromise<{
        success?: boolean;
    }> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/api/mcp/config/backup/{backupId}',
            path: {
                'backupId': backupId,
            },
            errors: {
                404: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Validate configuration
     * Validate an MCP configuration without saving it
     * @param requestBody
     * @returns any Configuration validation result
     * @throws ApiError
     */
    public postApiMcpConfigValidate(
        requestBody: Record<string, any>,
    ): CancelablePromise<{
        valid?: boolean;
        errors?: Array<{
            path?: string;
            message?: string;
            severity?: 'error' | 'warning' | 'info';
        }>;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/mcp/config/validate',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                500: `Error response`,
            },
        });
    }
}
