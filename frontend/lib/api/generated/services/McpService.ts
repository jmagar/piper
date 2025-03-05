/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Tool } from '../models/Tool';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class McpService {
  /**
   * Get MCP servers
   * Retrieve list of MCP servers
   * @returns any MCP servers retrieved successfully
   * @throws ApiError
   */
  public static getApiMcpServers(): CancelablePromise<Array<Record<string, any>>> {
    return __request(OpenAPI, {
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
   * @returns any MCP server created successfully
   * @throws ApiError
   */
  public static postApiMcpServers({
    requestBody,
  }: {
    requestBody: {
      name: string;
      type: string;
      url: string;
      metadata?: Record<string, any>;
    },
  }): CancelablePromise<Record<string, any>> {
    return __request(OpenAPI, {
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
   * @returns any MCP server details retrieved successfully
   * @throws ApiError
   */
  public static getApiMcpServers1({
    serverId,
  }: {
    serverId: string,
  }): CancelablePromise<Record<string, any>> {
    return __request(OpenAPI, {
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
   * @returns void
   * @throws ApiError
   */
  public static deleteApiMcpServers({
    serverId,
  }: {
    serverId: string,
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
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
  public static getApiMcpTools(): CancelablePromise<Array<Tool>> {
    return __request(OpenAPI, {
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
   * @returns Tool MCP tool created successfully
   * @throws ApiError
   */
  public static postApiMcpTools({
    requestBody,
  }: {
    requestBody: Tool,
  }): CancelablePromise<Tool> {
    return __request(OpenAPI, {
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
   * @returns Tool MCP tool retrieved successfully
   * @throws ApiError
   */
  public static getApiMcpTools1({
    toolId,
  }: {
    toolId: string,
  }): CancelablePromise<Tool> {
    return __request(OpenAPI, {
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
   * @returns Tool MCP tool updated successfully
   * @throws ApiError
   */
  public static putApiMcpTools({
    toolId,
    requestBody,
  }: {
    toolId: string,
    requestBody: Tool,
  }): CancelablePromise<Tool> {
    return __request(OpenAPI, {
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
   * @returns void
   * @throws ApiError
   */
  public static deleteApiMcpTools({
    toolId,
  }: {
    toolId: string,
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
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
   * @returns any Tool executed successfully
   * @throws ApiError
   */
  public static postApiMcpToolsExecute({
    name,
    requestBody,
  }: {
    name: string,
    requestBody: {
      params?: Record<string, any>;
      serverId?: string;
    },
  }): CancelablePromise<Record<string, any>> {
    return __request(OpenAPI, {
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
  public static getApiMcpHealth(): CancelablePromise<{
    status?: string;
    version?: string;
    uptime?: number;
    memoryUsage?: {
      total?: number;
      used?: number;
      free?: number;
    };
  }> {
    return __request(OpenAPI, {
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
  public static getApiMcpConfig(): CancelablePromise<Record<string, any>> {
    return __request(OpenAPI, {
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
   * @returns any MCP configuration updated successfully
   * @throws ApiError
   */
  public static putApiMcpConfig({
    requestBody,
    createBackup = true,
  }: {
    requestBody: Record<string, any>,
    /**
     * Whether to create a backup of the current configuration before updating
     */
    createBackup?: boolean,
  }): CancelablePromise<{
    success?: boolean;
    backupCreated?: boolean;
    backupPath?: string;
  }> {
    return __request(OpenAPI, {
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
  public static getApiMcpConfigBackup(): CancelablePromise<{
    backups?: Array<{
      id?: string;
      timestamp?: string;
      path?: string;
    }>;
  }> {
    return __request(OpenAPI, {
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
  public static postApiMcpConfigBackup(): CancelablePromise<{
    success?: boolean;
    backupPath?: string;
  }> {
    return __request(OpenAPI, {
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
   * @returns any Configuration backup retrieved successfully
   * @throws ApiError
   */
  public static getApiMcpConfigBackup1({
    backupId,
  }: {
    backupId: string,
  }): CancelablePromise<Record<string, any>> {
    return __request(OpenAPI, {
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
   * @returns any Configuration backup restored successfully
   * @throws ApiError
   */
  public static postApiMcpConfigBackup1({
    backupId,
    createBackup = true,
  }: {
    backupId: string,
    /**
     * Whether to create a backup of the current configuration before restoring
     */
    createBackup?: boolean,
  }): CancelablePromise<{
    success?: boolean;
    backupCreated?: boolean;
    backupPath?: string;
  }> {
    return __request(OpenAPI, {
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
   * @returns any Configuration backup deleted successfully
   * @throws ApiError
   */
  public static deleteApiMcpConfigBackup({
    backupId,
  }: {
    backupId: string,
  }): CancelablePromise<{
    success?: boolean;
  }> {
    return __request(OpenAPI, {
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
   * @returns any Configuration validation result
   * @throws ApiError
   */
  public static postApiMcpConfigValidate({
    requestBody,
  }: {
    requestBody: Record<string, any>,
  }): CancelablePromise<{
    valid?: boolean;
    errors?: Array<{
      path?: string;
      message?: string;
      severity?: 'error' | 'warning' | 'info';
    }>;
  }> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/mcp/config/validate',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        500: `Error response`,
      },
    });
  }
  /**
   * Get MCP logs
   * Retrieves MCP server logs based on filters
   * @returns any MCP logs retrieved successfully
   * @throws ApiError
   */
  public static getMcpLogs({
    level,
    server,
    limit = 100,
    skip,
    since,
  }: {
    /**
     * Filter logs by level
     */
    level?: 'debug' | 'info' | 'error',
    /**
     * Filter logs by server name
     */
    server?: string,
    /**
     * Maximum number of logs to return
     */
    limit?: number,
    /**
     * Number of logs to skip (pagination)
     */
    skip?: number,
    /**
     * Get logs since this timestamp (ISO format)
     */
    since?: string,
  }): CancelablePromise<{
    logs?: Array<{
      /**
       * ISO timestamp when the log was created
       */
      timestamp: string;
      /**
       * Debug namespace of the log
       */
      namespace: string;
      /**
       * Log level
       */
      level: 'info' | 'error' | 'debug';
      /**
       * Log message content
       */
      message: string;
      /**
       * Source of the log (Backend, Frontend, etc.)
       */
      server?: string;
    }>;
    /**
     * Total number of logs matching the filter
     */
    total?: number;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/mcp/logs',
      query: {
        'level': level,
        'server': server,
        'limit': limit,
        'skip': skip,
        'since': since,
      },
      errors: {
        500: `Server error`,
      },
    });
  }
  /**
   * Stream MCP logs
   * Establishes a WebSocket connection to stream logs in real-time
   * @returns any WebSocket connection established
   * @throws ApiError
   */
  public static streamMcpLogs(): CancelablePromise<{
    status?: 'connected';
    message?: string;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/mcp/logs/stream',
      errors: {
        500: `Server error`,
      },
    });
  }
  /**
   * Get MCP config schema
   * Retrieves the schema definition for MCP configuration
   * @returns any MCP config schema retrieved successfully
   * @throws ApiError
   */
  public static getMcpConfigSchema(): CancelablePromise<Record<string, any>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/mcp/config/schema',
      errors: {
        500: `Server error`,
      },
    });
  }
}
