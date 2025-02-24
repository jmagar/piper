/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class RealtimeService {
  /**
   * Get realtime connection status
   * @returns any Realtime connection status
   * @throws ApiError
   */
  public static getRealtimeStatus(): CancelablePromise<{
    status?: 'connected' | 'disconnected';
    connectedClients?: number;
    /**
     * Server uptime in seconds
     */
    uptime?: number;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/realtime/status',
      errors: {
        500: `Error response`,
      },
    });
  }
  /**
   * Send realtime event
   * @returns any Event sent
   * @throws ApiError
   */
  public static sendEvent({
    requestBody,
  }: {
    requestBody: {
      type: string;
      data: Record<string, any>;
      /**
       * Target user ID, if not specified broadcast to all
       */
      target?: string;
    },
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
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
