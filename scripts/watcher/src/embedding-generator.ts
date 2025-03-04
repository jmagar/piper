0import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { glob } from 'glob';
import { fileTypeFromFile } from 'file-type';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAI } from 'openai';
import { transformers } from '@xenova/transformers';
import config from './config.js';
import logger from './utils/logger.js';
import { treeGenerator } from './utils/tree-generator.js';

// File metadata cache interface
interface FileMetadata {
  hash: string;
  lineCount: number;
  lastUpdated: number;
}

// Cache of processed files to avoid reprocessing unchanged files
const fileCache: Record<string, FileMetadata> = {};

// Initialize Qdrant client
const qdrantClient = new QdrantClient({
  url: config.qdrantUrl,
  apiKey: config.qdrantApiKey,
});

// Initialize OpenAI client if needed
let openaiClient: OpenAI | null = null;
if (config.openaiApiKey) {
  openaiClient = new OpenAI({
    apiKey: config.openaiApiKey,
  });
}

// Local model variables
let localEmbeddingPipeline: any = null;

/**
 * Embedding generator to create vector embeddings for code files
 */
export class EmbeddingGenerator {
  private isInitialized = false;
  private directoryTree = '';

  /**
   * Initialize the embedding generator
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      logger.info('Initializing code embeddings generator');
      logger.info(`Using ${config.useLocalEmbeddings ? 'local' : 'OpenAI'} embeddings`);
      
      // Initialize local model if needed
      if (config.useLocalEmbeddings) {
        await this.initializeLocalModel();
      }
      
      // Ensure Qdrant collection exists
      await this.ensureCollection();
      
      this.isInitialized = true;
      logger.success('Embedding generator initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize embedding generator:', error);
      throw error;
    }
  }
  
  /**
   * Initialize the local embedding model
   */
  private async initializeLocalModel(): Promise<void> {
    try {
      const { pipeline } = await transformers.importModule('transformers');
      localEmbeddingPipeline = await pipeline('feature-extraction', config.localModel);
      logger.info(`Local embedding model initialized: ${config.localModel}`);
    } catch (error) {
      logger.error('Error initializing local embedding model:', error);
      
      if (openaiClient) {
        logger.info('Falling back to OpenAI embeddings');
        config.useLocalEmbeddings = false;
      } else {
        throw new Error('Failed to initialize local embedding model and no OpenAI API key provided');
      }
    }
  }
  
  /**
   * Ensure the Qdrant collection exists
   */
  private async ensureCollection(): Promise<void> {
    try {
      const collections = await qdrantClient.getCollections();
      const exists = collections.collections.some(coll => coll.name === config.qdrantCollection);
      
      if (!exists) {
        logger.info(`Creating Qdrant collection: ${config.qdrantCollection}`);
        await qdrantClient.createCollection(config.qdrantCollection, {
          vectors: {
            size: config.useLocalEmbeddings ? 384 : 1536, // Size depends on the model
            distance: 'Cosine',
          }
        });
      }
    } catch (error) {
      logger.error('Error ensuring Qdrant collection exists:', error);
      throw error;
    }
  }
  
  /**
   * Calculate file hash to detect changes
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  }
  
  /**
   * Count lines in a file
   */
  private async countLines(filePath: string): Promise<number> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content.split('\n').length;
    } catch (error) {
      logger.error(`Error counting lines in ${filePath}:`, error);
      return 0;
    }
  }
  
  /**
   * Check if a file should be processed
   */
  private async shouldProcessFile(filePath: string): Promise<boolean> {
    try {
      // Skip files matching ignore patterns
      if (config.ignorePatterns.some(pattern => filePath.includes(pattern))) {
        return false;
      }
      
      // Check file size
      const stats = await fs.stat(filePath);
      if (stats.size > config.maxFileSize * 1024) {
        logger.debug(`Skipping ${filePath}: file too large (${Math.round(stats.size / 1024)} KB)`);
        return false;
      }
      
      // Check if file is binary
      try {
        const fileType = await fileTypeFromFile(filePath);
        if (fileType && !fileType.mime.startsWith('text/')) {
          return false;
        }
      } catch {
        // If fileType can't determine, assume it's a text file
      }
      
      // Check if file has changed
      const currentHash = await this.calculateFileHash(filePath);
      const cachedMetadata = fileCache[filePath];
      
      if (cachedMetadata && cachedMetadata.hash === currentHash) {
        return false; // File hasn't changed
      }
      
      return true;
    } catch (error) {
      logger.error(`Error checking file ${filePath}:`, error);
      return false;
    }
  }
  
  /**
   * Generate embedding for content
   */
  private async generateEmbedding(content: string): Promise<number[]> {
    if (config.useLocalEmbeddings && localEmbeddingPipeline) {
      try {
        const output = await localEmbeddingPipeline(content, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
      } catch (error) {
        logger.error('Error generating local embedding:', error);
        if (openaiClient) {
          logger.info('Falling back to OpenAI embeddings for this file');
          return this.generateOpenAIEmbedding(content);
        } else {
          throw error;
        }
      }
    } else if (openaiClient) {
      return this.generateOpenAIEmbedding(content);
    } else {
      throw new Error('No embedding method available');
    }
  }
  
  /**
   * Generate embedding using OpenAI
   */
  private async generateOpenAIEmbedding(content: string): Promise<number[]> {
    if (!openaiClient) {
      throw new Error('OpenAI client not initialized');
    }
    
    try {
      const response = await openaiClient.embeddings.create({
        model: "text-embedding-ada-002",
        input: content,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      logger.error('Error generating OpenAI embedding:', error);
      throw error;
    }
  }
  
  /**
   * Process a single file
   */
  async processFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lineCount = content.split('\n').length;
      const hash = crypto.createHash('md5').update(content).digest('hex');
      
      // Prepare metadata
      const relativePath = path.relative(process.cwd(), filePath);
      const fileExt = path.extname(filePath).slice(1);
      
      // Generate embedding
      const embedding = await this.generateEmbedding(content);
      
      // Store in Qdrant
      await qdrantClient.upsert(config.qdrantCollection, {
        points: [{
          id: relativePath,
          vector: embedding,
          payload: {
            path: relativePath,
            content: content,
            extension: fileExt,
            lineCount: lineCount,
            lastUpdated: Date.now(),
            directoryTree: this.directoryTree,
          }
        }]
      });
      
      // Update cache
      fileCache[filePath] = {
        hash,
        lineCount,
        lastUpdated: Date.now(),
      };
      
      logger.info(`Processed ${relativePath} (${lineCount} lines)`);
    } catch (error) {
      logger.error(`Error processing file ${filePath}:`, error);
    }
  }
  
  /**
   * Generate a directory tree
   */
  private async generateDirectoryTree(): Promise<void> {
    if (config.generateDirectoryTree) {
      try {
        this.directoryTree = await treeGenerator.generateTree(config.watchPaths);
        logger.debug('Generated directory tree');
      } catch (error) {
        logger.error('Error generating directory tree:', error);
        this.directoryTree = '';
      }
    } else {
      this.directoryTree = '';
    }
  }
  
  /**
   * Find and process all files
   */
  async processAllFiles(): Promise<void> {
    // Ensure initialization
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Generate directory tree if enabled
    await this.generateDirectoryTree();
    
    // Process each folder
    for (const folder of config.watchPaths) {
      const pattern = path.join(folder, '**', '*.*');
      const ignorePattern = config.ignorePatterns.map(p => 
        p.includes('/') ? p : `**/${p}/**`
      );
      
      try {
        const files = await glob(pattern, { 
          ignore: ignorePattern,
          nodir: true
        });
        
        let processedCount = 0;
        let unchangedCount = 0;
        
        // Process files in batches
        for (let i = 0; i < files.length; i += config.batchSize) {
          const batch = files.slice(i, i + config.batchSize);
          
          const processingPromises = batch.map(async (file) => {
            if (await this.shouldProcessFile(file)) {
              await this.processFile(file);
              processedCount++;
            } else {
              unchangedCount++;
            }
          });
          
          await Promise.all(processingPromises);
        }
        
        logger.success(`Scan complete: ${processedCount} files processed, ${unchangedCount} unchanged`);
      } catch (error) {
        logger.error(`Error scanning folder ${folder}:`, error);
      }
    }
  }
  
  /**
   * Start scheduled processing
   */
  startScheduledProcessing(): NodeJS.Timeout | null {
    if (config.intervalMinutes <= 0) {
      logger.info('Scheduled processing disabled (interval is 0)');
      return null;
    }
    
    const intervalMs = config.intervalMinutes * 60 * 1000;
    logger.info(`Scheduling processing every ${config.intervalMinutes} minutes`);
    
    return setInterval(() => {
      logger.info('Running scheduled processing');
      this.processAllFiles().catch(error => {
        logger.error('Error during scheduled processing:', error);
      });
    }, intervalMs);
  }
}

// Export a singleton instance
export const embeddingGenerator = new EmbeddingGenerator();
export default embeddingGenerator;