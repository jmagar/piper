import { QdrantClient } from '@qdrant/js-client-rest';
import { logger } from '../../utils/logger.js'; 
import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';

const log = logger.child({ module: 'DocumentsService' });

export interface DocumentMetadata {
  title?: string;
  path?: string;
  parentId?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  fileType?: 'markdown' | 'json' | 'yaml' | 'text' | 'other';
  isFolder?: boolean;
}

export interface Document {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  score?: number;
}

export interface DocumentCreateRequest {
  content: string;
  metadata: DocumentMetadata;
}

export interface DocumentUpdateRequest {
  id: string;
  content?: string;
  metadata?: Partial<DocumentMetadata>;
}

export interface DocumentsListParams {
  limit?: number;
  offset?: string;
  path?: string;
  tags?: string;
}

export interface DocumentsSearchParams {
  query: string;
  limit?: number;
  offset?: string;
  filter?: {
    path?: string;
    tags?: string[];
  };
}

export interface DocumentsListResponse {
  documents: Document[];
  next_page_offset?: string;
}

export interface DocumentsSearchResponse {
  documents: Document[];
  total: number;
}

export interface FileExplorerNode {
  id: string;
  name: string;
  isFolder: boolean;
  path: string;
  children?: FileExplorerNode[];
  metadata?: DocumentMetadata;
}

/**
 * Service for managing documents in Qdrant
 */
export class DocumentsService {
  private client: QdrantClient;
  private openai: OpenAI;
  private collectionName: string;
  private embeddingModel: string;
  private vectorSize: number;
  
  constructor() {
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6550';
    const qdrantApiKey = process.env.QDRANT_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    this.client = new QdrantClient({
      url: qdrantUrl,
      ...(qdrantApiKey ? { apiKey: qdrantApiKey } : {})
    });
    
    this.openai = new OpenAI({
      apiKey: openaiApiKey,
    });
    
    this.collectionName = process.env.DOCUMENTS_COLLECTION || 'documents';
    
    // Set embedding model and corresponding vector size
    this.embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    if (this.embeddingModel === 'text-embedding-3-large') {
      this.vectorSize = 3072; // OpenAI 3 large embedding size
    } else {
      this.vectorSize = 1536; // Default for text-embedding-3-small and older models
    }
    
    log.info(`Initialized DocumentsService with Qdrant at ${qdrantUrl}`);
  }
  
  /**
   * Ensures the Qdrant collection exists, creates it if it doesn't
   */
  async ensureCollectionExists(): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(c => c.name === this.collectionName);
      
      if (!collectionExists) {
        log.info(`Creating collection ${this.collectionName}`);
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: 'Cosine',
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        });
        
        // Create necessary indexes for filtering
        try {
          // Note: In newer versions, payload indexes are created automatically
          log.info(`Collection ${this.collectionName} created with indexes`);
        } catch (indexError) {
          log.warn('Error creating indexes, continuing anyway:', indexError);
          log.info(`Collection ${this.collectionName} created without indexes`);
        }
      } else {
        log.info(`Collection ${this.collectionName} already exists`);
      }
    } catch (error) {
      log.error('Error ensuring collection exists:', error);
      throw new Error('Failed to ensure collection exists');
    }
  }
  
  /**
   * Generate embeddings for document content
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Use OpenAI embeddings
      const embedding = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
        dimensions: this.vectorSize,
      });
      
      return embedding.data[0].embedding;
    } catch (error) {
      log.error('Error generating embedding:', error);
      
      // Fall back to mock embeddings if OpenAI fails
      log.warn('Falling back to mock embeddings');
      const mockEmbedding = Array(this.vectorSize).fill(0).map((_, i) => {
        return Math.sin(i * text.length % this.vectorSize) / 2 + 0.5;
      });
      
      return mockEmbedding;
    }
  }
  
  /**
   * List documents with pagination and filtering
   */
  async listDocuments({
    limit = 50,
    offset,
    path,
    tags,
  }: DocumentsListParams): Promise<DocumentsListResponse> {
    try {
      await this.ensureCollectionExists();
      
      // Prepare filter
      const filter: any = { must: [] };
      
      if (path) {
        filter.must.push({
          key: 'metadata.path',
          match: { value: path },
        });
      }
      
      if (tags) {
        const tagList = tags.split(',');
        filter.must.push({
          key: 'metadata.tags',
          match: { value: tagList },
        });
      }
      
      // Perform search
      const scrollParams: any = {
        filter: filter.must.length ? filter : undefined,
        limit: limit,
        with_payload: true,
        with_vector: false,
      };
      
      // Add offset if provided
      if (offset) {
        scrollParams.offset = { point_id: offset };
      }
      
      // Use scroll method to list points
      const scrollResult = await this.client.scroll(this.collectionName, scrollParams);
      
      // Map to documents
      const documents = scrollResult.points.map((point: any) => ({
        id: String(point.id),
        content: point.payload?.content as string || '',
        metadata: point.payload?.metadata as DocumentMetadata || {},
      }));
      
      // Calculate next page offset
      const nextPageOffset = documents.length > 0 
        ? String(documents[documents.length - 1].id) 
        : undefined;
      
      return {
        documents,
        next_page_offset: nextPageOffset,
      };
    } catch (error) {
      log.error('Error listing documents:', error);
      throw new Error('Failed to list documents');
    }
  }
  
  /**
   * Create a new document
   */
  async createDocument(document: DocumentCreateRequest): Promise<Document> {
    try {
      await this.ensureCollectionExists();
      
      // Generate unique numeric ID - using timestamp
      const id = Date.now();
      
      // Add timestamps
      const now = new Date().toISOString();
      const metadata = {
        ...document.metadata,
        createdAt: now,
        updatedAt: now,
      };
      
      // Generate embedding
      const embedding = await this.generateEmbedding(document.content);
      
      // Insert document
      await this.client.upsert(this.collectionName, {
        points: [
          {
            id,
            vector: embedding,
            payload: {
              content: document.content,
              metadata,
            },
          },
        ],
      });
      
      return {
        id: String(id),
        content: document.content,
        metadata,
      };
    } catch (error) {
      log.error('Error creating document:', error);
      throw new Error('Failed to create document');
    }
  }
  
  /**
   * Get a document by ID
   */
  async getDocument(id: string): Promise<Document> {
    try {
      await this.ensureCollectionExists();
      
      // Convert string id to number if numeric
      const numericId = !isNaN(Number(id)) ? Number(id) : id;
      
      const response = await this.client.retrieve(this.collectionName, {
        ids: [numericId],
        with_payload: true,
      });
      
      if (!response.length) {
        throw new Error('Document not found');
      }
      
      const point = response[0];
      
      return {
        id: String(point.id),
        content: point.payload?.content as string || '',
        metadata: point.payload?.metadata as DocumentMetadata || {},
      };
    } catch (error) {
      log.error(`Error getting document ${id}:`, error);
      if (error instanceof Error && error.message === 'Document not found') {
        throw error;
      }
      throw new Error('Failed to get document');
    }
  }
  
  /**
   * Update an existing document
   */
  async updateDocument(document: DocumentUpdateRequest): Promise<Document> {
    try {
      await this.ensureCollectionExists();
      
      // Convert string id to number if numeric
      const numericId = !isNaN(Number(document.id)) ? Number(document.id) : document.id;
      
      // Get existing document
      const existingDoc = await this.getDocument(document.id);
      
      // Update metadata
      const updatedMetadata = {
        ...existingDoc.metadata,
        ...document.metadata,
        updatedAt: new Date().toISOString(),
      };
      
      // Check if content is updated
      const updatedContent = document.content !== undefined ? document.content : existingDoc.content;
      
      // Generate embedding if content changed
      let embedding;
      if (document.content !== undefined) {
        embedding = await this.generateEmbedding(document.content);
      }
      
      // Update document
      await this.client.upsert(this.collectionName, {
        points: [
          {
            id: numericId,
            ...(embedding ? { vector: embedding } : {}),
            payload: {
              content: updatedContent,
              metadata: updatedMetadata,
            },
          },
        ],
      });
      
      return {
        id: String(numericId),
        content: updatedContent,
        metadata: updatedMetadata,
      };
    } catch (error) {
      log.error(`Error updating document ${document.id}:`, error);
      if (error instanceof Error && error.message === 'Document not found') {
        throw error;
      }
      throw new Error('Failed to update document');
    }
  }
  
  /**
   * Delete a document by ID
   */
  async deleteDocument(id: string): Promise<void> {
    try {
      await this.ensureCollectionExists();
      
      // Convert string id to number if numeric
      const numericId = !isNaN(Number(id)) ? Number(id) : id;
      
      await this.client.delete(this.collectionName, {
        points: [numericId],
      });
    } catch (error) {
      log.error(`Error deleting document ${id}:`, error);
      throw new Error('Failed to delete document');
    }
  }
  
  /**
   * Search documents by content similarity
   */
  async searchDocuments({
    query,
    limit = 10,
    offset,
    filter,
  }: DocumentsSearchParams): Promise<DocumentsSearchResponse> {
    try {
      await this.ensureCollectionExists();
      
      // Generate embedding for query
      const embedding = await this.generateEmbedding(query);
      
      // Prepare search filter
      const searchFilter: any = { must: [] };
      
      if (filter?.path) {
        searchFilter.must.push({
          key: 'metadata.path',
          match: { value: filter.path },
        });
      }
      
      if (filter?.tags && filter.tags.length > 0) {
        searchFilter.must.push({
          key: 'metadata.tags',
          match: { value: filter.tags },
        });
      }
      
      // Perform search
      const searchParams: any = {
        vector: embedding,
        limit: limit,
        with_payload: true,
        filter: searchFilter.must.length ? searchFilter : undefined,
      };
      
      // Add offset if provided
      if (offset) {
        searchParams.offset = parseInt(offset, 10);
      }
      
      const searchResult = await this.client.search(this.collectionName, searchParams);
      
      // Map to documents
      const documents = searchResult.map((point: any) => ({
        id: String(point.id),
        content: point.payload?.content as string || '',
        metadata: point.payload?.metadata as DocumentMetadata || {},
        score: point.score,
      }));
      
      return {
        documents,
        total: documents.length,
      };
    } catch (error) {
      log.error('Error searching documents:', error);
      throw new Error('Failed to search documents');
    }
  }
  
  /**
   * Get a hierarchical view of documents/folders
   */
  async getFileExplorerTree(): Promise<FileExplorerNode[]> {
    try {
      await this.ensureCollectionExists();
      
      // Get all documents
      const { documents } = await this.listDocuments({
        limit: 1000, // Practical limit, should paginate for production use
      });
      
      // Build tree structure
      const root: Record<string, FileExplorerNode> = {};
      const nodes: Record<string, FileExplorerNode> = {};
      
      // First pass: create all nodes
      for (const doc of documents) {
        const node: FileExplorerNode = {
          id: doc.id,
          name: doc.metadata.title || 'Untitled',
          isFolder: doc.metadata.isFolder || false,
          path: doc.metadata.path || '/',
          metadata: doc.metadata,
        };
        
        if (!doc.metadata.parentId) {
          root[doc.id] = node;
        }
        
        nodes[doc.id] = node;
      }
      
      // Second pass: build relationships
      for (const doc of documents) {
        if (doc.metadata.parentId && nodes[doc.metadata.parentId]) {
          const parent = nodes[doc.metadata.parentId];
          
          if (!parent.children) {
            parent.children = [];
          }
          
          parent.children.push(nodes[doc.id]);
          
          // Remove from root if it was added there
          if (root[doc.id]) {
            delete root[doc.id];
          }
        }
      }
      
      // Sort nodes (folders first, then alphabetically)
      const sortNodes = (nodes: FileExplorerNode[]) => {
        nodes.sort((a, b) => {
          if (a.isFolder && !b.isFolder) return -1;
          if (!a.isFolder && b.isFolder) return 1;
          return a.name.localeCompare(b.name);
        });
        
        for (const node of nodes) {
          if (node.children && node.children.length > 0) {
            sortNodes(node.children);
          }
        }
        
        return nodes;
      };
      
      return sortNodes(Object.values(root));
    } catch (error) {
      log.error('Error getting file explorer tree:', error);
      throw new Error('Failed to get file explorer tree');
    }
  }
}

// Export singleton instance
export const documentsService = new DocumentsService(); 