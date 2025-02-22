/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AnalyticsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get API usage statistics
     * @param startDate
     * @param endDate
     * @returns any Usage statistics
     * @throws ApiError
     */
    public getUsage(
        startDate?: string,
        endDate?: string,
    ): CancelablePromise<{
        totalTokens?: {
            input?: number;
            output?: number;
            total?: number;
        };
        costBreakdown?: {
            input?: number;
            output?: number;
            total?: number;
        };
        timeSeriesData?: Array<{
            date?: string;
            tokens?: number;
            cost?: number;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/analytics/usage',
            query: {
                'startDate': startDate,
                'endDate': endDate,
            },
            errors: {
                400: `Error response`,
                500: `Error response`,
            },
        });
    }
}
