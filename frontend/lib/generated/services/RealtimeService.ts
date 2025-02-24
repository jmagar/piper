/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class RealtimeService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get realtime connection status
     * @returns any Realtime connection status
     * @throws ApiError
     */
    public getRealtimeStatus(): CancelablePromise<{
        status?: 'connected' | 'disconnected';
        connectedClients?: number;
        /**
         * Server uptime in seconds
         */
        uptime?: number;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/realtime/status',
            errors: {
                500: `Error response`,
            },
        });
    }
    /**
     * Send realtime event
     * @param requestBody
     * @returns any Event sent
     * @throws ApiError
     */
    public sendEvent(
        requestBody: {
            type: string;
            data: Record<string, any>;
            /**
             * Target user ID, if not specified broadcast to all
             */
            target?: string;
        },
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/realtime/events',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
                500: `Error response`,
            },
        });
    }
}
