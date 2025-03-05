/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { paths_1api_1dashboard_1activity_get_responses_200_content_application_1json_schema_properties_activities_items } from '../models/paths_1api_1dashboard_1activity_get_responses_200_content_application_1json_schema_properties_activities_items';
import type { paths_1api_1dashboard_1alerts_1_id_1read_post_responses_200_content_application_1json_schema } from '../models/paths_1api_1dashboard_1alerts_1_id_1read_post_responses_200_content_application_1json_schema';
import type { paths_1api_1dashboard_1documents_get_responses_200_content_application_1json_schema_properties_documents_items } from '../models/paths_1api_1dashboard_1documents_get_responses_200_content_application_1json_schema_properties_documents_items';
import type { paths_1api_1prompts_post_responses_201_content_application_1json_schema } from '../models/paths_1api_1prompts_post_responses_201_content_application_1json_schema';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class DefaultService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get dashboard summary
     * Returns a summary of key metrics for the dashboard
     * @returns any Dashboard summary
     * @throws ApiError
     */
    public getApiDashboardSummary(): CancelablePromise<{
        recentActivities?: Array<paths_1api_1dashboard_1activity_get_responses_200_content_application_1json_schema_properties_activities_items>;
        /**
         * Number of unread alerts
         */
        unreadAlerts?: number;
        /**
         * Total number of documents
         */
        documentCount?: number;
        /**
         * Total number of prompt templates
         */
        promptCount?: number;
        conversations?: {
            total?: number;
            today?: number;
            active?: number;
        };
        serverStatus?: {
            online?: number;
            offline?: number;
            error?: number;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/dashboard/summary',
            errors: {
                401: `Unauthorized`,
            },
        });
    }
    /**
     * Get document statistics
     * Returns document statistics and recent documents
     * @param limit Number of documents to return
     * @param offset Number of documents to skip
     * @returns any Document statistics
     * @throws ApiError
     */
    public getApiDashboardDocuments(
        limit: number = 10,
        offset?: number,
    ): CancelablePromise<{
        documents?: Array<{
            /**
             * Unique identifier for the document
             */
            id: string;
            /**
             * Title of the document
             */
            title: string;
            /**
             * Document type (PDF, Word, Text, etc.)
             */
            type: string;
            /**
             * Path to the document
             */
            path: string;
            /**
             * Size of the document in bytes
             */
            size: number;
            /**
             * Collections/categories the document belongs to
             */
            collections: Array<string>;
            /**
             * Number of times the document has been accessed
             */
            accessCount: number;
            /**
             * When the document was added
             */
            addedAt: string;
            /**
             * When the document was last accessed
             */
            lastAccessed?: string;
            /**
             * ID of the user who owns the document
             */
            userId?: string;
        }>;
        /**
         * Total number of documents
         */
        count?: number;
        recentlyAccessed?: Array<paths_1api_1dashboard_1documents_get_responses_200_content_application_1json_schema_properties_documents_items>;
        /**
         * Breakdown of documents by type
         */
        typeBreakdown?: Record<string, number>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/dashboard/documents',
            query: {
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `Unauthorized`,
            },
        });
    }
    /**
     * Get MCP server statistics
     * Returns statistics about MCP servers and tools
     * @returns any MCP server statistics
     * @throws ApiError
     */
    public getApiDashboardMcpServers(): CancelablePromise<{
        servers: Array<{
            id?: string;
            name?: string;
            status?: 'online' | 'offline' | 'error';
            lastUsed?: string;
            toolCount?: number;
            usageCount?: number;
        }>;
        /**
         * Total number of available tools
         */
        totalTools: number;
        /**
         * Total number of tool requests
         */
        totalRequests: number;
        /**
         * Success rate of tool requests
         */
        successRate: number;
        topTools?: Array<{
            id?: string;
            name?: string;
            serverId?: string;
            usageCount?: number;
            lastUsed?: string;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/dashboard/mcp-servers',
            errors: {
                401: `Unauthorized`,
            },
        });
    }
    /**
     * Get alerts
     * Returns system alerts for the current user
     * @param read Filter by read status
     * @param type Filter by alert type
     * @param limit Number of alerts to return
     * @param offset Number of alerts to skip
     * @returns any List of alerts
     * @throws ApiError
     */
    public getApiDashboardAlerts(
        read?: boolean,
        type?: 'error' | 'warning' | 'info' | 'success',
        limit: number = 10,
        offset?: number,
    ): CancelablePromise<{
        alerts?: Array<paths_1api_1dashboard_1alerts_1_id_1read_post_responses_200_content_application_1json_schema>;
        /**
         * Total number of alerts matching the filters
         */
        count?: number;
        /**
         * Number of unread alerts
         */
        unreadCount?: number;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/dashboard/alerts',
            query: {
                'read': read,
                'type': type,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `Unauthorized`,
            },
        });
    }
    /**
     * Mark an alert as read
     * Marks an alert with the specified ID as read
     * @param id ID of the alert
     * @returns any Alert marked as read
     * @throws ApiError
     */
    public postApiDashboardAlertsRead(
        id: string,
    ): CancelablePromise<{
        /**
         * Unique identifier for the alert
         */
        id: string;
        /**
         * Type of alert
         */
        type: 'error' | 'warning' | 'info' | 'success';
        /**
         * Alert title
         */
        title: string;
        /**
         * Alert message content
         */
        message: string;
        /**
         * Whether the alert has been read
         */
        read: boolean;
        /**
         * When the alert was created
         */
        timestamp: string;
        /**
         * ID of the user the alert is for
         */
        userId?: string;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/dashboard/alerts/{id}/read',
            path: {
                'id': id,
            },
            errors: {
                401: `Unauthorized`,
                404: `Alert not found`,
            },
        });
    }
    /**
     * Delete an alert
     * Deletes an alert with the specified ID
     * @param id ID of the alert
     * @returns void
     * @throws ApiError
     */
    public deleteApiDashboardAlerts(
        id: string,
    ): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/api/dashboard/alerts/{id}',
            path: {
                'id': id,
            },
            errors: {
                401: `Unauthorized`,
                404: `Alert not found`,
            },
        });
    }
    /**
     * Get user activity log
     * Returns the activity log for the current user
     * @param type Filter by activity type
     * @param startDate Filter activities after this date
     * @param endDate Filter activities before this date
     * @param limit Number of activities to return
     * @param offset Number of activities to skip
     * @returns any List of activities
     * @throws ApiError
     */
    public getApiDashboardActivity(
        type?: 'chat' | 'tool' | 'document' | 'login' | 'system' | 'search',
        startDate?: string,
        endDate?: string,
        limit: number = 10,
        offset?: number,
    ): CancelablePromise<{
        activities?: Array<{
            /**
             * Unique identifier for the activity
             */
            id: string;
            /**
             * Type of activity
             */
            type: 'chat' | 'tool' | 'document' | 'login' | 'system' | 'search';
            /**
             * Description of the activity
             */
            description: string;
            /**
             * Additional details about the activity
             */
            details?: Record<string, any>;
            /**
             * When the activity occurred
             */
            timestamp: string;
            /**
             * ID of the user who performed the activity
             */
            userId: string;
        }>;
        /**
         * Total number of activities matching the filters
         */
        count?: number;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/dashboard/activity',
            query: {
                'type': type,
                'startDate': startDate,
                'endDate': endDate,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `Unauthorized`,
            },
        });
    }
    /**
     * List prompt templates
     * Returns a list of prompt templates based on the provided filters
     * @param userId Filter by user ID
     * @param category Filter by category
     * @param tags Filter by tags
     * @param isPublic Filter by public status
     * @param isFavorited Filter by favorited status
     * @param search Search term for title and description
     * @param sort Field to sort by
     * @param order Sort order
     * @param limit Number of prompts to return
     * @param offset Number of prompts to skip
     * @returns any List of prompt templates
     * @throws ApiError
     */
    public getApiPrompts(
        userId?: string,
        category?: string,
        tags?: Array<string>,
        isPublic?: boolean,
        isFavorited?: boolean,
        search?: string,
        sort?: 'usageCount' | 'updatedAt' | 'createdAt' | 'title',
        order: 'asc' | 'desc' = 'desc',
        limit: number = 10,
        offset?: number,
    ): CancelablePromise<{
        prompts: Array<paths_1api_1prompts_post_responses_201_content_application_1json_schema>;
        /**
         * Total number of prompts matching the filters
         */
        count: number;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/prompts',
            query: {
                'userId': userId,
                'category': category,
                'tags': tags,
                'isPublic': isPublic,
                'isFavorited': isFavorited,
                'search': search,
                'sort': sort,
                'order': order,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                400: `Bad request`,
                401: `Unauthorized`,
            },
        });
    }
    /**
     * Create a new prompt template
     * Creates a new prompt template with the provided data
     * @param requestBody
     * @returns any Prompt template created
     * @throws ApiError
     */
    public postApiPrompts(
        requestBody: {
            /**
             * Title of the prompt template
             */
            title: string;
            /**
             * Description of what the prompt template does
             */
            description: string;
            /**
             * The actual prompt template content with placeholders
             */
            content: string;
            /**
             * Category of the prompt template
             */
            category: string;
            /**
             * Tags for organizing and filtering prompt templates
             */
            tags?: Array<string>;
            /**
             * Whether the prompt is public or private
             */
            isPublic?: boolean;
        },
    ): CancelablePromise<{
        /**
         * Unique identifier for the prompt template
         */
        id: string;
        /**
         * Title of the prompt template
         */
        title: string;
        /**
         * Description of what the prompt template does
         */
        description: string;
        /**
         * The actual prompt template content with placeholders
         */
        content: string;
        /**
         * Category of the prompt template (e.g., Documentation, Development)
         */
        category: string;
        /**
         * Tags for organizing and filtering prompt templates
         */
        tags: Array<string>;
        /**
         * Number of times the prompt has been used
         */
        usageCount: number;
        /**
         * Whether the prompt is public or private
         */
        isPublic: boolean;
        /**
         * Whether the prompt has been favorited by the user
         */
        isFavorited: boolean;
        /**
         * When the prompt was created
         */
        createdAt: string;
        /**
         * When the prompt was last updated
         */
        updatedAt: string;
        /**
         * ID of the user who created the prompt
         */
        userId?: string;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/prompts',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request`,
                401: `Unauthorized`,
            },
        });
    }
    /**
     * Get a prompt template by ID
     * Returns a prompt template with the specified ID
     * @param id ID of the prompt template
     * @returns paths_1api_1prompts_post_responses_201_content_application_1json_schema Prompt template
     * @throws ApiError
     */
    public getApiPrompts1(
        id: string,
    ): CancelablePromise<paths_1api_1prompts_post_responses_201_content_application_1json_schema> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/prompts/{id}',
            path: {
                'id': id,
            },
            errors: {
                401: `Unauthorized`,
                404: `Prompt template not found`,
            },
        });
    }
    /**
     * Update a prompt template
     * Updates a prompt template with the specified ID
     * @param id ID of the prompt template
     * @param requestBody
     * @returns paths_1api_1prompts_post_responses_201_content_application_1json_schema Prompt template updated
     * @throws ApiError
     */
    public putApiPrompts(
        id: string,
        requestBody: {
            /**
             * Title of the prompt template
             */
            title?: string;
            /**
             * Description of what the prompt template does
             */
            description?: string;
            /**
             * The actual prompt template content with placeholders
             */
            content?: string;
            /**
             * Category of the prompt template
             */
            category?: string;
            /**
             * Tags for organizing and filtering prompt templates
             */
            tags?: Array<string>;
            /**
             * Whether the prompt is public or private
             */
            isPublic?: boolean;
            /**
             * Whether the prompt has been favorited by the user
             */
            isFavorited?: boolean;
        },
    ): CancelablePromise<paths_1api_1prompts_post_responses_201_content_application_1json_schema> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/api/prompts/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request`,
                401: `Unauthorized`,
                404: `Prompt template not found`,
            },
        });
    }
    /**
     * Delete a prompt template
     * Deletes a prompt template with the specified ID
     * @param id ID of the prompt template
     * @returns void
     * @throws ApiError
     */
    public deleteApiPrompts(
        id: string,
    ): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/api/prompts/{id}',
            path: {
                'id': id,
            },
            errors: {
                401: `Unauthorized`,
                404: `Prompt template not found`,
            },
        });
    }
    /**
     * Toggle favorite status of a prompt template
     * Toggles the favorite status of a prompt template
     * @param id ID of the prompt template
     * @returns paths_1api_1prompts_post_responses_201_content_application_1json_schema Favorite status toggled
     * @throws ApiError
     */
    public postApiPromptsFavorite(
        id: string,
    ): CancelablePromise<paths_1api_1prompts_post_responses_201_content_application_1json_schema> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/prompts/{id}/favorite',
            path: {
                'id': id,
            },
            errors: {
                401: `Unauthorized`,
                404: `Prompt template not found`,
            },
        });
    }
    /**
     * Use a prompt template
     * Records usage of a prompt template and increases its usage count
     * @param id ID of the prompt template
     * @param requestBody
     * @returns any Prompt template usage recorded
     * @throws ApiError
     */
    public postApiPromptsUse(
        id: string,
        requestBody: {
            /**
             * ID of the conversation where the prompt was used
             */
            conversationId?: string;
        },
    ): CancelablePromise<{
        /**
         * Unique identifier for the usage record
         */
        id: string;
        /**
         * ID of the prompt template that was used
         */
        promptId: string;
        /**
         * ID of the conversation where the prompt was used
         */
        conversationId?: string;
        /**
         * ID of the user who used the prompt
         */
        userId?: string;
        /**
         * When the prompt was used
         */
        usedAt: string;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/prompts/{id}/use',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized`,
                404: `Prompt template not found`,
            },
        });
    }
}
