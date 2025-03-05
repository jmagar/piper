/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { paths_1api_1knowledge_1documents_1_id_get_responses_200_content_application_1json_schema } from '../models/paths_1api_1knowledge_1documents_1_id_get_responses_200_content_application_1json_schema';
import type { paths_1api_1knowledge_1documents_post_requestBody_content_application_1json_schema } from '../models/paths_1api_1knowledge_1documents_post_requestBody_content_application_1json_schema';
import type { paths_1api_1knowledge_1upload_post_responses_201_content_application_1json_schema } from '../models/paths_1api_1knowledge_1upload_post_responses_201_content_application_1json_schema';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class KnowledgeService {
  /**
   * Search the knowledge base
   * Performs semantic search on the knowledge base
   * @returns any Successful search
   * @throws ApiError
   */
  public static searchKnowledge({
    requestBody,
  }: {
    requestBody: {
      /**
       * The search query to find relevant documents
       */
      query: string;
      /**
       * Optional collection to search within
       */
      collection?: string;
      /**
       * Maximum number of results to return
       */
      limit?: number;
      /**
       * Similarity threshold for results (0.0-1.0)
       */
      threshold?: number;
    },
  }): CancelablePromise<{
    results?: Array<{
      /**
       * Unique identifier for the document
       */
      id?: string;
      /**
       * Similarity score (0.0-1.0)
       */
      score?: number;
      /**
       * Document content snippet
       */
      content?: string;
      /**
       * Document metadata
       */
      metadata?: {
        title?: string;
        source?: string;
        collection?: string;
        created_at?: string;
        updated_at?: string;
        tags?: Array<string>;
      };
    }>;
    /**
     * Total number of matching documents
     */
    total?: number;
    /**
     * The original search query
     */
    query?: string;
  }> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/knowledge/search',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Invalid request`,
        500: `Server error`,
      },
    });
  }
  /**
   * List knowledge documents
   * Retrieves documents from the knowledge base with filtering options
   * @returns any List of documents
   * @throws ApiError
   */
  public static listKnowledgeDocuments({
    collection,
    tag,
    bookmarked,
    query,
    limit = 50,
    offset,
  }: {
    /**
     * Filter by collection name
     */
    collection?: string,
    /**
     * Filter by tag
     */
    tag?: string,
    /**
     * Filter for bookmarked documents only
     */
    bookmarked?: boolean,
    /**
     * Filter by text search
     */
    query?: string,
    /**
     * Maximum number of documents to return
     */
    limit?: number,
    /**
     * Pagination offset
     */
    offset?: number,
  }): CancelablePromise<{
    documents?: Array<paths_1api_1knowledge_1documents_1_id_get_responses_200_content_application_1json_schema>;
    /**
     * Total number of matching documents
     */
    total?: number;
    /**
     * List of available collections
     */
    collections?: Array<string>;
    /**
     * List of all tags across returned documents
     */
    tags?: Array<string>;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/knowledge/documents',
      query: {
        'collection': collection,
        'tag': tag,
        'bookmarked': bookmarked,
        'query': query,
        'limit': limit,
        'offset': offset,
      },
      errors: {
        400: `Invalid request`,
        500: `Server error`,
      },
    });
  }
  /**
   * Create knowledge document
   * Creates a new document in the knowledge base
   * @returns paths_1api_1knowledge_1upload_post_responses_201_content_application_1json_schema Document created successfully
   * @throws ApiError
   */
  public static createKnowledgeDocument({
    requestBody,
  }: {
    requestBody: {
      /**
       * Document title
       */
      title: string;
      /**
       * Document content
       */
      content: string;
      /**
       * Collection the document belongs to
       */
      collection: string;
      /**
       * Tags to categorize the document
       */
      tags?: Array<string>;
      /**
       * Additional document metadata
       */
      metadata?: Record<string, any>;
    },
  }): CancelablePromise<paths_1api_1knowledge_1upload_post_responses_201_content_application_1json_schema> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/knowledge/documents',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Invalid request`,
        500: `Server error`,
      },
    });
  }
  /**
   * Get knowledge document
   * Retrieves a specific document from the knowledge base
   * @returns any Document details
   * @throws ApiError
   */
  public static getKnowledgeDocument({
    id,
  }: {
    /**
     * Document ID
     */
    id: string,
  }): CancelablePromise<{
    /**
     * Unique identifier for the document
     */
    id?: string;
    /**
     * Document title
     */
    title?: string;
    /**
     * Document content
     */
    content?: string;
    /**
     * Collection the document belongs to
     */
    collection?: string;
    /**
     * Additional document metadata
     */
    metadata?: Record<string, any>;
    /**
     * Whether the document is bookmarked
     */
    bookmarked?: boolean;
    tags?: Array<string>;
    created_at?: string;
    updated_at?: string;
    /**
     * Text extracted from the original file
     */
    extracted_text?: string;
    /**
     * URL to the original source
     */
    url?: string;
    /**
     * Path or reference to the original file
     */
    original_file?: string;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/knowledge/documents/{id}',
      path: {
        'id': id,
      },
      errors: {
        404: `Document not found`,
        500: `Server error`,
      },
    });
  }
  /**
   * Update knowledge document
   * Updates an existing document in the knowledge base
   * @returns paths_1api_1knowledge_1upload_post_responses_201_content_application_1json_schema Document updated successfully
   * @throws ApiError
   */
  public static updateKnowledgeDocument({
    id,
    requestBody,
  }: {
    /**
     * Document ID
     */
    id: string,
    requestBody: paths_1api_1knowledge_1documents_post_requestBody_content_application_1json_schema,
  }): CancelablePromise<paths_1api_1knowledge_1upload_post_responses_201_content_application_1json_schema> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/knowledge/documents/{id}',
      path: {
        'id': id,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Invalid request`,
        404: `Document not found`,
        500: `Server error`,
      },
    });
  }
  /**
   * Delete knowledge document
   * Deletes a document from the knowledge base
   * @returns any Document deleted successfully
   * @throws ApiError
   */
  public static deleteKnowledgeDocument({
    id,
  }: {
    /**
     * Document ID
     */
    id: string,
  }): CancelablePromise<{
    /**
     * Status of the delete operation (success, error)
     */
    status?: string;
    /**
     * Message describing the result
     */
    message?: string;
  }> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/knowledge/documents/{id}',
      path: {
        'id': id,
      },
      errors: {
        404: `Document not found`,
        500: `Server error`,
      },
    });
  }
  /**
   * Bookmark knowledge document
   * Toggles the bookmark status of a document
   * @returns any Bookmark status updated successfully
   * @throws ApiError
   */
  public static bookmarkKnowledgeDocument({
    id,
    requestBody,
  }: {
    /**
     * Document ID
     */
    id: string,
    requestBody: {
      /**
       * Whether the document should be bookmarked
       */
      bookmarked: boolean;
    },
  }): CancelablePromise<{
    status?: string;
    bookmarked?: boolean;
  }> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/knowledge/documents/{id}/bookmark',
      path: {
        'id': id,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        404: `Document not found`,
        500: `Server error`,
      },
    });
  }
  /**
   * Download original file
   * Downloads the original file associated with a document
   * @returns binary File download
   * @throws ApiError
   */
  public static downloadKnowledgeDocumentFile({
    id,
  }: {
    /**
     * Document ID
     */
    id: string,
  }): CancelablePromise<Blob> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/knowledge/documents/{id}/download',
      path: {
        'id': id,
      },
      errors: {
        404: `Document or file not found`,
        500: `Server error`,
      },
    });
  }
  /**
   * Upload and process file
   * Uploads a file, extracts content, and creates a document
   * @returns any File uploaded and processed successfully
   * @throws ApiError
   */
  public static uploadKnowledgeFile({
    formData,
  }: {
    formData: {
      /**
       * File to upload
       */
      file: Blob;
      /**
       * Collection to add the document to
       */
      collection?: string;
      /**
       * Tags for the document
       */
      tags?: Array<string>;
    },
  }): CancelablePromise<{
    /**
     * Unique identifier for the created document
     */
    id?: string;
    /**
     * Status of the document creation (success, error)
     */
    status?: string;
    /**
     * Message describing the result
     */
    message?: string;
  }> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/knowledge/upload',
      formData: formData,
      mediaType: 'multipart/form-data',
      errors: {
        400: `Invalid request or unsupported file type`,
        500: `Server error`,
      },
    });
  }
  /**
   * List knowledge collections
   * Retrieves all collections in the knowledge base
   * @returns any List of collections
   * @throws ApiError
   */
  public static listKnowledgeCollections(): CancelablePromise<{
    collections?: Array<{
      /**
       * Collection name
       */
      name?: string;
      /**
       * Collection description
       */
      description?: string;
      /**
       * Number of documents in the collection
       */
      document_count?: number;
      created_at?: string;
      updated_at?: string;
    }>;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/knowledge/collections',
      errors: {
        500: `Server error`,
      },
    });
  }
  /**
   * Create knowledge collection
   * Creates a new collection in the knowledge base
   * @returns any Collection created successfully
   * @throws ApiError
   */
  public static createKnowledgeCollection({
    requestBody,
  }: {
    requestBody: {
      /**
       * Collection name
       */
      name: string;
      /**
       * Collection description
       */
      description?: string;
    },
  }): CancelablePromise<{
    name?: string;
    status?: string;
  }> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/knowledge/collections',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Invalid request or collection already exists`,
        500: `Server error`,
      },
    });
  }
}
