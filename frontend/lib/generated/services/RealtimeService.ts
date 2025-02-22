/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class RealtimeService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get realtime events
     * @param userId
     * @param type
     * @param since
     * @returns any List of events
     * @throws ApiError
     */
    public getEvents(
        userId?: string,
        type?: 'message' | 'typing' | 'presence',
        since?: string,
    ): CancelablePromise<Array<{
        id?: string;
        type?: 'message' | 'typing' | 'presence';
        userId?: string;
        data?: Record<string, any>;
        timestamp?: string;
    }>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/realtime/events',
            query: {
                'userId': userId,
                'type': type,
                'since': since,
            },
            errors: {
                400: `Error response`,
                401: `Error response`,
                500: `Error response`,
            },
        });
    }
}
