/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ConfigService {
  /**
   * Get configuration
   * Retrieve application configuration
   * @returns any Configuration retrieved successfully
   * @throws ApiError
   */
  public static getApiConfig(): CancelablePromise<Record<string, any>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/config',
    });
  }
  /**
   * Update configuration
   * Update application configuration
   * @returns any Configuration updated successfully
   * @throws ApiError
   */
  public static putApiConfig({
    requestBody,
  }: {
    requestBody: Record<string, any>,
  }): CancelablePromise<Record<string, any>> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/config',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
}
