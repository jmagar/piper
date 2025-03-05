import { QdrantClient } from '@qdrant/js-client-rest';
import { SearchParams, Filter, ScoredPoint } from '@qdrant/js-client-rest/dist/types';
import { Logger } from '../../utils/logger';
import debug from 'debug';

const log = debug('pooper:knowledge');
const logger = new Logger('KnowledgeService');

export interface KnowledgeSearchParams {
  query: string;
  collection?: string;
  limit?: number;
  threshold?: number;
}

export interface KnowledgeDocumentsParams {
  collection?: string;
  tag?: string;
  bookmarked?: boolean;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface KnowledgeSearchResult {
  id: string;
  score: number;
  content: string;
  metadata: {
    title: string;
    source: string;
    collection: string;
    created_at: string;
    updated_at: string;
    tags: string[];
  };
}

export interface KnowledgeSearchResponse {
  results: KnowledgeSearchResult[];
  total: number;
  query: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  collection: string;
  metadata: Record<string, any>;
  bookmarked: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface KnowledgeCollection {
  name: string;
  description: string;
  document_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Service for interacting with the Qdrant vector database for knowledge management
 */
export class KnowledgeService {
  private client: QdrantClient;
  private defaultCollection: string;
  
  constructor() {
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    const qdrantApiKey = process.env.QDRANT_API_KEY;
    
    this.client = new QdrantClient({
      url: qdrantUrl,
      ...(qdrantApiKey ? { apiKey: qdrantApiKey } : {})
    });
    
    this.defaultCollection = process.env.QDRANT_COLLECTION || 'pooper-knowledge';
    
    log(`Initialized KnowledgeService with Qdrant at ${qdrantUrl}`);
    logger.info(`Initialized KnowledgeService with Qdrant at ${qdrantUrl}`);
  }
  
  /**
   * Performs semantic search on the knowledge base
   */
  async search({ query, collection, limit = 10, threshold = 0.7 }: KnowledgeSearchParams): Promise<KnowledgeSearchResponse> {
    try {
      log(`Searching for: "${query}" in collection: ${collection || this.defaultCollection}`);
      logger.info(`Searching for: "${query}" in collection: ${collection || this.defaultCollection}`);
      
      // Generate embedding for query using our embedding service
      const embedding = await this.generateEmbedding(query);
      
      // Prepare search parameters
      const searchParams: SearchParams = {
        vector: embedding,
        limit: limit,
        with_payload: true,
        score_threshold: threshold
      };
      
      // Add filter if collection is specified
      if (collection) {
        searchParams.filter = {
          must: [
            {
              key: 'metadata.collection',
              match: { value: collection }
            }
          ]
        };
      }
      
      // Perform search
      const searchResult = await this.client.search(
        collection || this.defaultCollection,
        searchParams
      );
      
      // Transform results
      const results = searchResult.map((result: ScoredPoint) => ({
        id: String(result.id),
        score: result.score || 0,
        content: result.payload?.content || '',
        metadata: {
          title: result.payload?.metadata?.title || '',
          source: result.payload?.metadata?.source || '',
          collection: result.payload?.metadata?.collection || '',
          created_at: result.payload?.metadata?.created_at || '',
          updated_at: result.payload?.metadata?.updated_at || '',
          tags: result.payload?.metadata?.tags || []
        }
      }));
      
      return {
        results,
        total: results.length,
        query
      };
    } catch (error) {
      log.extend('error')('Error searching knowledge base:', error);
      logger.error('Error searching knowledge base:', error);
      throw new Error('Failed to search knowledge base');
    }
  }
  
  /**
   * Lists all collections in the knowledge base
   */
  async listCollections() {
    try {
      log('Listing all collections');
      logger.info('Listing all collections');
      
      const collectionsResult = await this.client.getCollections();
      const collections = await Promise.all(
        collectionsResult.collections.map(async (coll: { name: string }) => {
          try {
            const collInfo = await this.client.getCollection(coll.name);
            const count = await this.client.count(coll.name);
            
            return {
              name: coll.name,
              description: collInfo.config?.params?.description || '',
              document_count: count.count,
              created_at: collInfo.config?.created_at || new Date().toISOString(),
              updated_at: collInfo.config?.updated_at || new Date().toISOString()
            };
          } catch (error) {
            log.extend('error')(`Error getting info for collection ${coll.name}:`, error);
            logger.error(`Error getting info for collection ${coll.name}:`, error);
            return {
              name: coll.name,
              description: '',
              document_count: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          }
        })
      );
      
      return { collections };
    } catch (error) {
      log.extend('error')('Error listing collections:', error);
      logger.error('Error listing collections:', error);
      throw new Error('Failed to list collections');
    }
  }
  
  /**
   * Lists documents from the knowledge base with filtering options
   */
  async listDocuments({
    collection,
    tag,
    bookmarked,
    query,
    limit = 50,
    offset = 0
  }: KnowledgeDocumentsParams) {
    try {
      log(`Listing documents with filters: ${JSON.stringify({
        collection,
        tag,
        bookmarked,
        query,
        limit,
        offset
      })}`);
      logger.info(`Listing documents with filters: ${JSON.stringify({
        collection,
        tag,
        bookmarked,
        query,
        limit,
        offset
      })}`);
      
      const targetCollection = collection || this.defaultCollection;
      
      // Build filter with initialized must array
      const filter: Filter = { must: [] };
      
      if (collection) {
        filter.must?.push({
          key: 'metadata.collection',
          match: { value: collection }
        });
      }
      
      if (tag) {
        filter.must?.push({
          key: 'metadata.tags',
          match: { value: tag }
        });
      }
      
      if (bookmarked === true) {
        filter.must?.push({
          key: 'bookmarked',
          match: { value: true }
        });
      }
      
      // If query is provided, perform vector search, otherwise scroll through points
      let docs = [];
      let totalCount = 0;
      
      if (query) {
        const embedding = await this.generateEmbedding(query);
        const searchParams: SearchParams = {
          vector: embedding,
          limit: limit,
          offset: offset,
          with_payload: true,
          filter: filter.must?.length ? filter : undefined
        };
        
        const searchResult = await this.client.search(
          targetCollection,
          searchParams
        );
        
        docs = searchResult.map(this.mapPointToDocument);
        totalCount = await this.getFilteredCount(targetCollection, filter);
      } else {
        // Use scroll API for pagination without vector search
        const scrollResult = await this.client.scroll(
          targetCollection,
          {
            limit: limit,
            offset: offset,
            with_payload: true,
            filter: filter.must?.length ? filter : undefined
          }
        );
        
        docs = scrollResult.points.map(this.mapPointToDocument);
        totalCount = await this.getFilteredCount(targetCollection, filter);
      }
      
      // Get unique collections and tags
      const collections = await this.getUniqueCollections();
      const tags = this.getUniqueTags(docs);
      
      return {
        documents: docs,
        total: totalCount,
        collections,
        tags
      };
    } catch (error) {
      log.extend('error')('Error listing documents:', error);
      logger.error('Error listing documents:', error);
      throw new Error('Failed to list documents');
    }
  }
  
  /**
   * Maps a Qdrant point to a document object
   */
  private mapPointToDocument(point: any): KnowledgeDocument {
    return {
      id: String(point.id),
      title: point.payload?.metadata?.title || '',
      content: point.payload?.content || '',
      collection: point.payload?.metadata?.collection || '',
      metadata: point.payload?.metadata || {},
      bookmarked: point.payload?.bookmarked || false,
      tags: point.payload?.metadata?.tags || [],
      created_at: point.payload?.metadata?.created_at || new Date().toISOString(),
      updated_at: point.payload?.metadata?.updated_at || new Date().toISOString()
    };
  }
  
  /**
   * Gets the count of points matching a filter
   */
  private async getFilteredCount(collection: string, filter: Filter): Promise<number> {
    try {
      const countResult = await this.client.count(
        collection,
        { exact: true, filter: filter.must?.length ? filter : undefined }
      );
      return countResult.count;
    } catch (error) {
      log.extend('error')('Error getting filtered count:', error);
      logger.error('Error getting filtered count:', error);
      return 0;
    }
  }
  
  /**
   * Gets a list of unique collection names
   */
  private async getUniqueCollections(): Promise<string[]> {
    try {
      const collectionsResult = await this.client.getCollections();
      return collectionsResult.collections.map((coll: { name: string }) => coll.name);
    } catch (error) {
      log.extend('error')('Error getting unique collections:', error);
      logger.error('Error getting unique collections:', error);
      return [];
    }
  }
  
  /**
   * Gets a list of unique tags from documents
   */
  private getUniqueTags(documents: KnowledgeDocument[]): string[] {
    const tagsSet = new Set<string>();
    documents.forEach(doc => {
      if (Array.isArray(doc.tags)) {
        doc.tags.forEach((tag: string) => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet);
  }
  
  /**
   * Generates an embedding for a text using OpenAI
   * Note: This would normally use your existing embedding service
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // TODO: Replace this with your actual embedding generation method
    // This is just a placeholder that returns a random vector
    log(`Generating embedding for text: "${text.substring(0, 50)}..."`);
    logger.info(`Generating embedding for text: "${text.substring(0, 50)}..."`);
    
    // In a real implementation, you would call your embedding service or OpenAI directly
    // For now, we're returning a placeholder vector with 3072 dimensions for OpenAI 3 large embedding model
    return Array(3072).fill(0).map(() => Math.random() * 2 - 1);
  }
}

export const knowledgeService = new KnowledgeService();

/**
 * Get document statistics from Qdrant
 * @returns DocumentStats with counts and collection info
 */
export async function getDocumentStats(): Promise<{
  totalDocuments: number;
  recentDocuments: number;
  collections: { name: string; count: number }[];
  totalCollections: number;
  recentlyAccessed?: { id: string; title: string; timestamp: string };
  mostAccessed?: { id: string; title: string; accessCount: number };
  topTags: { tag: string; count: number }[];
}> {
  try {
    // Connect to Qdrant and get document stats
    const client = await getQdrantClient();
    
    // Get collections
    const collectionsResponse = await client.getCollections();
    const collections = collectionsResponse.collections || [];
    const knowledgeCollections = collections.filter((c: { name: string }) => 
      !c.name.startsWith('_') && c.name !== 'system'
    );
    
    // Initialize stats object
    const stats = {
      totalDocuments: 0,
      recentDocuments: 0,
      collections: [] as { name: string; count: number }[],
      totalCollections: knowledgeCollections.length,
      topTags: [] as { tag: string; count: number }[]
    };
    
    // Collect stats from each collection
    for (const collection of knowledgeCollections) {
      try {
        // Get collection info
        const collectionInfo = await client.getCollection(collection.name);
        const count = collectionInfo.points_count || 0;
        
        stats.collections.push({
          name: collection.name,
          count
        });
        
        stats.totalDocuments += count;
        
        // Get recent documents (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentFilter = {
          must: [
            {
              key: "created_at",
              range: {
                gt: sevenDaysAgo.toISOString()
              }
            }
          ]
        };
        
        const recentCount = await client.count(collection.name, {
          filter: recentFilter
        });
        
        stats.recentDocuments += recentCount.count;
        
        // Get tags
        const tagsResponse = await client.scroll(collection.name, {
          limit: 100,
          with_payload: {
            include: ["tags"]
          }
        });
        
        // Extract and count tags
        const tagCounts: Record<string, number> = {};
        tagsResponse.points.forEach((point: any) => {
          const tags = point.payload?.tags as string[] || [];
          tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        });
        
        // Merge with existing tags
        Object.entries(tagCounts).forEach(([tag, count]) => {
          const existingTag = stats.topTags.find(t => t.tag === tag);
          if (existingTag) {
            existingTag.count += count;
          } else {
            stats.topTags.push({ tag, count });
          }
        });
      } catch (error) {
        log.extend('error')(`Error getting stats for collection ${collection.name}:`, error);
        logger.error(`Error getting stats for collection ${collection.name}:`, error);
      }
    }
    
    // Sort collections by size
    stats.collections.sort((a, b) => b.count - a.count);
    
    // Sort and limit top tags
    stats.topTags.sort((a, b) => b.count - a.count);
    stats.topTags = stats.topTags.slice(0, 10);
    
    return stats;
  } catch (error) {
    log.extend('error')('Error getting document stats:', error);
    logger.error('Error getting document stats:', error);
    // Return fallback stats if there's an error
    return {
      totalDocuments: 0,
      recentDocuments: 0,
      collections: [],
      totalCollections: 0,
      topTags: []
    };
  }
}

// Helper function to get Qdrant client
async function getQdrantClient() {
  const { QdrantClient } = await import('@qdrant/js-client-rest');
  
  // Get connection details from environment or config
  const url = process.env.QDRANT_URL || 'http://localhost:6333';
  const apiKey = process.env.QDRANT_API_KEY;
  
  const clientConfig: { url: string; apiKey?: string } = { url };
  if (apiKey) {
    clientConfig.apiKey = apiKey;
  }
  
  return new QdrantClient(clientConfig);
} 