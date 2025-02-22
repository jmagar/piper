/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ToolsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get tool execution history
     * @param toolId
     * @param userId
     * @param status
     * @param since
     * @returns any List of tool executions
     * @throws ApiError
     */
    public getToolExecutions(
        toolId?: string,
        userId?: string,
        status?: 'pending' | 'running' | 'completed' | 'failed',
        since?: string,
    ): CancelablePromise<{
        executions?: Array<{
            id?: string;
            toolId?: string;
            userId?: string;
            status?: 'pending' | 'running' | 'completed' | 'failed';
            input?: Record<string, any>;
            output?: Record<string, any>;
            error?: {
                code?: string;
                message?: string;
                details?: Record<string, any>;
            };
            startTime?: string;
            endTime?: string;
        }>;
        nextCursor?: string;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/tools/executions',
            query: {
                'toolId': toolId,
                'userId': userId,
                'status': status,
                'since': since,
            },
            errors: {
                400: `Error response`,
                404: `Error response`,
                500: `Error response`,
            },
        });
    }
}
