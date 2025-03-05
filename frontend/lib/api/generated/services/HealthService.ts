/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class HealthService {
  /**
   * Health check endpoint
   * Check if the API is running
   * @returns any API is healthy
   * @throws ApiError
   */
  public static getApiHealth(): CancelablePromise<{
    status?: string;
    version?: string;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/health',
    });
  }
}
