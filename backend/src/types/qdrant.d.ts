/**
 * Type declarations for Qdrant client
 */

declare module '@qdrant/js-client-rest' {
  export class QdrantClient {
    constructor(options: { url: string; apiKey?: string });
    search(collectionName: string, searchParams: import('@qdrant/js-client-rest/dist/types').SearchParams): Promise<import('@qdrant/js-client-rest/dist/types').ScoredPoint[]>;
    getCollections(): Promise<{ collections: { name: string }[] }>;
    getCollection(name: string): Promise<{ 
      config: { 
        params: Record<string, any>;
        created_at?: string;
        updated_at?: string;
      } 
    }>;
    count(collectionName: string, countParams?: { exact: boolean; filter?: import('@qdrant/js-client-rest/dist/types').Filter }): Promise<{ count: number }>;
    scroll(collectionName: string, scrollParams: { limit: number; offset: number; with_payload: boolean; filter?: import('@qdrant/js-client-rest/dist/types').Filter }): Promise<{ points: any[] }>;
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