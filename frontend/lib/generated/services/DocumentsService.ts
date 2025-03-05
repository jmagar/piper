/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { paths_1api_1documents_1tree_get_responses_200_content_application_1json_schema_properties_tree_items } from '../models/paths_1api_1documents_1tree_get_responses_200_content_application_1json_schema_properties_tree_items';
import type { paths_1api_1documents_post_requestBody_content_application_1json_schema_properties_metadata } from '../models/paths_1api_1documents_post_requestBody_content_application_1json_schema_properties_metadata';
import type { paths_1api_1documents_post_responses_201_content_application_1json_schema } from '../models/paths_1api_1documents_post_responses_201_content_application_1json_schema';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class DocumentsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * List documents
     * Retrieve a list of documents, with optional filtering
     * @param limit Maximum number of documents to return
     * @param offset Pagination offset token
     * @param path Filter by document path
     * @param tags Filter by tags (comma separated)
     * @returns any List of documents
     * @throws ApiError
     */
    public getApiDocuments(
        limit: number = 50,
        offset?: string,
        path?: string,
        tags?: string,
    ): CancelablePromise<{
        documents?: Array<paths_1api_1documents_post_responses_201_content_application_1json_schema>;
        /**
         * Token for retrieving the next page of results
         */
        next_page_offset?: string;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/documents',
            query: {
                'limit': limit,
                'offset': offset,
                'path': path,
                'tags': tags,
            },
            errors: {
                500: `Error response`,
            },
        });
    }
    /**
     * Create a document
     * Create a new document with content and metadata
     * @param requestBody
     * @returns any Document created successfully
     * @throws ApiError
     */
    public postApiDocuments(
        requestBody: {
            /**
             * Document content
             */
            content: string;
            metadata: {
                /**
                 * Document title
                 */
                title?: string;
                /**
                 * Path within the document hierarchy
                 */
                path?: string;
                /**
                 * ID of the parent document/folder
                 */
                parentId?: string;
                /**
                 * Tags for categorizing the document
                 */
                tags?: Array<string>;
                /**
                 * Creation timestamp
                 */
                createdAt?: string;
                /**
                 * Last update timestamp
                 */
                updatedAt?: string;
                /**
                 * Type of the document (markdown, json, yaml, etc.)
                 */
                fileType?: 'markdown' | 'json' | 'yaml' | 'text' | 'other';
                /**
                 * Whether this is a folder containing other documents
                 */
                isFolder?: boolean;
            };
        },
    ): CancelablePromise<{
        /**
         * Unique identifier for the document
         */
        id: string;
        /**
         * Document content
         */
        content: string;
        metadata: paths_1api_1documents_post_requestBody_content_application_1json_schema_properties_metadata;
        /**
         * Similarity score (only present in search results)
         */
        score?: number;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/documents',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Get a document
     * Retrieve a document by ID
     * @param id Document ID
     * @returns paths_1api_1documents_post_responses_201_content_application_1json_schema Document details
     * @throws ApiError
     */
    public getApiDocuments1(
        id: string,
    ): CancelablePromise<paths_1api_1documents_post_responses_201_content_application_1json_schema> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/documents/{id}',
            path: {
                'id': id,
            },
            errors: {
                404: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Update a document
     * Update an existing document
     * @param id Document ID
     * @param requestBody
     * @returns paths_1api_1documents_post_responses_201_content_application_1json_schema Document updated successfully
     * @throws ApiError
     */
    public putApiDocuments(
        id: string,
        requestBody: {
            /**
             * Updated document content
             */
            content?: string;
            metadata?: paths_1api_1documents_post_requestBody_content_application_1json_schema_properties_metadata;
        },
    ): CancelablePromise<paths_1api_1documents_post_responses_201_content_application_1json_schema> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/api/documents/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Delete a document
     * Delete a document by ID
     * @param id Document ID
     * @returns any Document deleted successfully
     * @throws ApiError
     */
    public deleteApiDocuments(
        id: string,
    ): CancelablePromise<{
        success?: boolean;
        message?: string;
    }> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/api/documents/{id}',
            path: {
                'id': id,
            },
            errors: {
                404: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Search documents
     * Search for documents using vector similarity search
     * @param requestBody
     * @returns any Search results
     * @throws ApiError
     */
    public postApiDocumentsSearch(
        requestBody: {
            /**
             * Search query string
             */
            query?: string;
            /**
             * Maximum number of results to return
             */
            limit?: number;
            /**
             * Token for pagination
             */
            offset?: string;
            /**
             * Additional filters to apply
             */
            filter?: {
                /**
                 * Filter by document path
                 */
                path?: string;
                /**
                 * Filter by tags
                 */
                tags?: Array<string>;
            };
        },
    ): CancelablePromise<{
        documents?: Array<paths_1api_1documents_post_responses_201_content_application_1json_schema>;
        /**
         * Total number of matching documents
         */
        total?: number;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/documents/search',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
                500: `Error response`,
            },
        });
    }
    /**
     * Get document tree
     * Retrieve a hierarchical view of documents for file explorer
     * @returns any File explorer tree
     * @throws ApiError
     */
    public getApiDocumentsTree(): CancelablePromise<{
        /**
         * Hierarchical file structure
         */
        tree?: Array<{
            /**
             * Unique identifier for the node
             */
            id?: string;
            /**
             * Display name of the node
             */
            name?: string;
            /**
             * Whether this is a folder
             */
            isFolder?: boolean;
            /**
             * Full path to the node
             */
            path?: string;
            /**
             * Child nodes (for folders)
             */
            children?: Array<paths_1api_1documents_1tree_get_responses_200_content_application_1json_schema_properties_tree_items>;
            metadata?: paths_1api_1documents_post_requestBody_content_application_1json_schema_properties_metadata;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/documents/tree',
            errors: {
                500: `Error response`,
            },
        });
    }
}
