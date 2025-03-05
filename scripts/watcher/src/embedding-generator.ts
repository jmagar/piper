import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { glob } from 'glob';
import { fileTypeFromFile } from 'file-type';
import { QdrantClient } from '@qdrant/js-client-rest';
import axios from 'axios';
import OpenAI from 'openai';
// Import will be done dynamically in the initializeLocalModel method
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Get current file directory (ES modules equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

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

// Add OpenAI API key from environment variables
const openaiApiKey = process.env.OPENAI_API_KEY;
const openRouterApiKey = process.env.OPENROUTER_API_KEY;

// Initialize OpenAI client
const openaiClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

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
      
      if (config.useLocalEmbeddings) {
        logger.info(`Using local embeddings model: ${config.localModel}`);
        await this.initializeLocalModel();
      } else if (openaiClient) {
        logger.info(`Using OpenAI embeddings model: ${config.openaiEmbeddingModel}`);
      } else if (openRouterApiKey) {
        logger.info('Using OpenAI embeddings via OpenRouter');
      } else {
        throw new Error('No embedding method available - please provide OpenAI API key or enable local embeddings');
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
      // Use the exact import approach that works in simple-test.js
      const { pipeline } = await import('@xenova/transformers');
      localEmbeddingPipeline = await pipeline('feature-extraction', config.localModel);
      logger.info(`Local embedding model initialized: ${config.localModel}`);
    } catch (error) {
      logger.error('Error initializing local embedding model:', error);
      
      if (openRouterApiKey) {
        logger.info('Falling back to OpenAI embeddings via OpenRouter');
        config.useLocalEmbeddings = false;
      } else {
        throw new Error('Failed to initialize local embedding model and no OpenRouter API key provided');
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
        // Determine vector size based on model
        let vectorSize = 1536; // Default for older OpenAI models
        
        if (config.useLocalEmbeddings) {
          vectorSize = 1024; // Size for e5-large-v2
        } else if (config.openaiEmbeddingModel === 'text-embedding-3-large') {
          vectorSize = 3072; // Size for text-embedding-3-large
        } else if (config.openaiEmbeddingModel === 'text-embedding-3-small') {
          vectorSize = 1536; // Size for text-embedding-3-small
        }
        
        logger.info(`Creating Qdrant collection: ${config.qdrantCollection} with vector size ${vectorSize}`);
        await qdrantClient.createCollection(config.qdrantCollection, {
          vectors: {
            size: vectorSize,
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
    // Use local embeddings if enabled and available
    if (config.useLocalEmbeddings && localEmbeddingPipeline) {
      try {
        const output = await localEmbeddingPipeline(content, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
      } catch (error) {
        logger.error('Error generating local embedding:', error);
        // Try fallback options
        if (openaiClient) {
          logger.info('Falling back to direct OpenAI embeddings');
          return this.generateDirectOpenAIEmbedding(content);
        } else if (openRouterApiKey) {
          logger.info('Falling back to OpenAI embeddings via OpenRouter');
          return this.generateOpenRouterEmbedding(content);
        } else {
          throw error;
        }
      }
    }
    // Use direct OpenAI if client is available
    else if (openaiClient) {
      return this.generateDirectOpenAIEmbedding(content);
    } 
    // Use OpenRouter as fallback
    else if (openRouterApiKey) {
      return this.generateOpenRouterEmbedding(content);
    } 
    // No embedding method available
    else {
      throw new Error('No embedding method available');
    }
  }
  
  /**
   * Generate embedding using OpenAI directly
   */
  private async generateDirectOpenAIEmbedding(content: string): Promise<number[]> {
    if (!openaiClient) {
      throw new Error('OpenAI client not initialized');
    }
    
    try {
      logger.debug(`Generating embedding with OpenAI model: ${config.openaiEmbeddingModel}`);
      const response = await openaiClient.embeddings.create({
        model: config.openaiEmbeddingModel,
        input: content,
        encoding_format: 'float'
      });
      
      return response.data[0].embedding;
    } catch (error) {
      logger.error('Error generating direct OpenAI embedding:', error);
      
      // Try fallback to OpenRouter if available
      if (openRouterApiKey) {
        logger.info('Falling back to OpenAI embeddings via OpenRouter');
        return this.generateOpenRouterEmbedding(content);
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Generate embedding using OpenAI via OpenRouter
   */
  private async generateOpenRouterEmbedding(content: string): Promise<number[]> {
    if (!openRouterApiKey) {
      throw new Error('OpenRouter API key not provided');
    }
    
    try {
      // Use direct Axios call to OpenRouter for embeddings
      const response = await axios.post(
        'https://openrouter.ai/api/v1/embeddings',
        {
          model: "openai/text-embedding-ada-002",
          input: content
        },
        {
          headers: {
            'Authorization': `Bearer ${openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://pooper.app', // Replace with your actual domain
            'X-Title': 'Pooper App'
          }
        }
      );
      
      return response.data.data[0].embedding;
    } catch (error) {
      logger.error('Error generating embedding via OpenRouter:', error);
      throw error;
    }
  }
  
  /**
   * Process a single file
   */
  async processFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lineCount = await this.countLines(filePath);
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
          
          const processingPromises = batch.map(async (file: string) => {
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
