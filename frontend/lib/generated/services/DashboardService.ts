/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConversationStats } from '../models/ConversationStats';
import type { UserStats } from '../models/UserStats';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class DashboardService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get dashboard statistics
     * Retrieve statistics for the dashboard
     * @returns any Dashboard statistics retrieved successfully
     * @throws ApiError
     */
    public getApiDashboardStats(): CancelablePromise<{
        userStats?: Array<UserStats>;
        conversationStats?: Array<ConversationStats>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/dashboard/stats',
        });
    }
}
