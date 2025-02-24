/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Tool } from '../models/Tool';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ToolsService {
  /**
   * Get available tools
   * @returns Tool List of available tools
   * @throws ApiError
   */
  public static getAvailableTools(): CancelablePromise<Array<Tool>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/tools',
      errors: {
        500: `Error response`,
      },
    });
  }
  /**
   * Invoke a tool
   * @returns any Tool invocation result
   * @throws ApiError
   */
  public static invokeTool({
    toolId,
    requestBody,
  }: {
    toolId: string,
    requestBody: {
      parameters: Record<string, any>;
    },
  }): CancelablePromise<{
    result?: Record<string, any>;
  }> {
    return __request(OpenAPI, {
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
