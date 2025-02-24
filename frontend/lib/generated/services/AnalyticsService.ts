/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AnalyticsService {
  /**
   * Get analytics metrics
   * @returns any Analytics metrics
   * @throws ApiError
   */
  public static getMetrics({
    startDate,
    endDate,
    userId,
  }: {
    startDate?: string,
    endDate?: string,
    userId?: string,
  }): CancelablePromise<{
    messageCount?: number;
    userCount?: number;
    toolUsage?: Record<string, number>;
    activeUsers?: Array<{
      userId?: string;
      messageCount?: number;
      lastActive?: string;
    }>;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/analytics/metrics',
      query: {
        'startDate': startDate,
        'endDate': endDate,
        'userId': userId,
      },
      errors: {
        500: `Error response`,
      },
    });
  }
}
