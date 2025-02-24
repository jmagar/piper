/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AnalyticsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get analytics metrics
     * @param startDate
     * @param endDate
     * @param userId
     * @returns any Analytics metrics
     * @throws ApiError
     */
    public getMetrics(
        startDate?: string,
        endDate?: string,
        userId?: string,
    ): CancelablePromise<{
        messageCount?: number;
        userCount?: number;
        toolUsage?: Record<string, number>;
        activeUsers?: Array<{
            userId?: string;
            messageCount?: number;
            lastActive?: string;
        }>;
    }> {
        return this.httpRequest.request({
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
