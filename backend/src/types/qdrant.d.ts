/**
 * Type declarations for Qdrant client
 */

import { QdrantClient as BaseQdrantClient } from '@qdrant/js-client-rest';

declare module '@qdrant/js-client-rest' {
  interface QdrantClient extends BaseQdrantClient {
    /**
     * Create a new collection
     */
    createCollection(collectionName: string, params: any): Promise<any>;
    
    /**
     * Upload points to a collection
     */
    upsert(collectionName: string, params: {
      points: Array<{
        id: string | number;
        vector?: number[];
        payload?: any;
      }>;
    }): Promise<any>;
    
    /**
     * Retrieve points by their ids
     */
    retrieve(collectionName: string, params: {
      ids: Array<string | number>;
      with_payload?: boolean;
      with_vector?: boolean;
    }): Promise<any>;
    
    /**
     * Delete points by their ids
     */
    delete(collectionName: string, params: {
      points: Array<string | number>;
    }): Promise<any>;
    
    /**
     * Search for points
     */
    search(collectionName: string, params: any): Promise<any>;
    
    /**
     * Scroll through points
     */
    scroll(collectionName: string, params: any): Promise<any>;
  }
}

declare module '@qdrant/js-client-rest/dist/types' {
  export interface SearchParams {
    vector: number[];
    limit?: number;
    offset?: number;
    with_payload?: boolean;
    score_threshold?: number;
    filter?: Filter;
  }

  export interface Filter {
    must?: FilterCondition[];
    must_not?: FilterCondition[];
    should?: FilterCondition[];
  }

  export interface FilterCondition {
    key: string;
    match?: { value: any };
    range?: Record<string, any>;
    geo_bounding_box?: Record<string, any>;
    geo_radius?: Record<string, any>;
  }

  export interface ScoredPoint {
    id: string | number;
    score?: number;
    payload?: Record<string, any>;
    vector?: number[];
  }
} 