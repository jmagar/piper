/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class DashboardService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get server stats
     * Returns various server statistics and metrics
     * @returns any Server stats retrieved successfully
     * @throws ApiError
     */
    public getServerStats(): CancelablePromise<{
        /**
         * Server uptime in seconds
         */
        uptime: number;
        /**
         * Total number of requests processed
         */
        totalRequests: number;
        /**
         * Current number of active connections
         */
        activeConnections: number;
        memoryUsage: {
            /**
             * Total size of the heap in bytes
             */
            heapTotal?: number;
            /**
             * Actual memory used in bytes
             */
            heapUsed?: number;
            /**
             * Memory used by external resources
             */
            external?: number;
            /**
             * Resident Set Size in bytes
             */
            rss?: number;
        };
        /**
         * System load averages for 1, 5, and 15 minutes
         */
        systemLoad: Array<number>;
        cpuUsage: {
            /**
             * CPU time spent in user code
             */
            user?: number;
            /**
             * CPU time spent in system code
             */
            system?: number;
        };
        lastError?: {
            message?: string;
            timestamp?: string;
        } | null;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/dashboard/stats',
            errors: {
                401: `Unauthorized`,
                500: `Internal server error`,
            },
        });
    }
}
