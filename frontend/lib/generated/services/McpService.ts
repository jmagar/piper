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
   * Get available tools
   * @returns Tool List of available tools
   * @throws ApiError
   */
  public static getTools(): CancelablePromise<Array<Tool>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/mcp/tools',
      errors: {
        500: `Error response`,
      },
    });
  }
  /**
   * Register a new tool
   * @returns Tool Tool registered
   * @throws ApiError
   */
  public static registerTool({
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
   * Get tool by ID
   * @returns Tool Tool details
   * @throws ApiError
   */
  public static getTool({
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
   * Update tool
   * @returns Tool Tool updated
   * @throws ApiError
   */
  public static updateTool({
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
   * Delete tool
   * @returns void
   * @throws ApiError
   */
  public static deleteTool({
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
}
