import * as fs from 'fs/promises';
import * as path from 'path';
import config from './config.js';
import logger from './utils/logger.js';
import { extensionWatcher } from './extension-watcher.js';
import { embeddingGenerator } from './embedding-generator.js';
import { fileWatcher } from './file-watcher.js';

/**
 * Main application class for the code watcher
 */
class CodeWatcher {
  private embeddingsInterval: NodeJS.Timeout | null = null;
  
  /**
   * Initialize the watcher components
   */
  async initialize(): Promise<void> {
    logger.info('Initializing Code Watcher');
    logger.info(`Watch paths: ${config.watchPaths.join(', ')}`);
    logger.info(`Extension duplicate watcher: ${config.enableExtensionWatcher ? 'enabled' : 'disabled'}`);
    logger.info(`Specific file watcher: ${config.enableFileWatcher ? 'enabled' : 'disabled'}`);
    logger.info(`Embeddings generator: ${config.enableEmbeddings ? 'enabled' : 'disabled'}`);
    
    // Verify watch paths exist
    for (const watchPath of config.watchPaths) {
      try {
        await fs.access(watchPath);
      } catch (error) {
        logger.warn(`Watch path does not exist or is not accessible: ${watchPath}`);
      }
    }
    
    // Initialize components
    const startupPromises: Promise<void>[] = [];
    
    if (config.enableExtensionWatcher) {
      startupPromises.push(this.initializeExtensionWatcher());
    }
    
    if (config.enableFileWatcher) {
      startupPromises.push(this.initializeFileWatcher());
    }
    
    if (config.enableEmbeddings) {
      startupPromises.push(this.initializeEmbeddingsGenerator());
    }
    
    await Promise.all(startupPromises);
    
    logger.success('Code Watcher started successfully');
  }
  
  /**
   * Initialize the file extension watcher
   */
  private async initializeExtensionWatcher(): Promise<void> {
    logger.info('Initializing file extension watcher');
    
    // Scan all directories
    for (const watchPath of config.watchPaths) {
      await extensionWatcher.scanDirectory(watchPath);
    }
    
    // Start watching for changes
    extensionWatcher.startWatching();
    
    // Log current duplicates
    const duplicates = extensionWatcher.getDuplicates();
    const duplicateCount = Object.keys(duplicates).length;
    
    if (duplicateCount > 0) {
      logger.warn(`Found ${duplicateCount} file(s) with duplicate names but different extensions`);
    } else {
      logger.info('No duplicate filenames found during initial scan');
    }
  }
  
  /**
   * Initialize the specific file watcher
   */
  private async initializeFileWatcher(): Promise<void> {
    logger.info('Initializing specific file watcher');
    logger.info(`Monitoring ${config.watchFiles.length} file patterns`);
    
    // Scan files for initial state
    await fileWatcher.scanFiles();
    
    // Start watching for changes
    fileWatcher.startWatching();
    
    // Set up listeners for content issues and changes
    fileWatcher.on('content-violation', (violation) => {
      logger.warn(`Content issue detected: ${violation.message}`);
    });
    
    fileWatcher.on('lint-results', (results) => {
      if (results.error) {
        logger.warn(`Lint command produced errors`);
      } else {
        logger.debug('Lint command completed');
      }
    });
  }
  
  /**
   * Initialize the embeddings generator
   */
  private async initializeEmbeddingsGenerator(): Promise<void> {
    logger.info('Initializing embeddings generator');
    
    try {
      // Initialize the generator
      await embeddingGenerator.initialize();
      
      // Run initial processing
      await embeddingGenerator.processAllFiles();
      
      // Set up scheduled processing
      this.embeddingsInterval = embeddingGenerator.startScheduledProcessing();
    } catch (error) {
      logger.error('Failed to initialize embeddings generator:', error);
      logger.warn('Embeddings functionality will be disabled');
    }
  }
  
  /**
   * Cleanup resources on shutdown
   */
  shutdown(): void {
    logger.info('Shutting down Code Watcher');
    
    if (config.enableExtensionWatcher) {
      extensionWatcher.stopWatching();
    }
    
    if (config.enableFileWatcher) {
      fileWatcher.stopWatching();
    }
    
    if (this.embeddingsInterval) {
      clearInterval(this.embeddingsInterval);
      this.embeddingsInterval = null;
    }
    
    logger.info('Code Watcher shutdown complete');
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const watcher = new CodeWatcher();
  
  // Handle cleanup on exit
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down...');
    watcher.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down...');
    watcher.shutdown();
    process.exit(0);
  });
  
  // Start the watcher
  try {
    await watcher.initialize();
  } catch (error) {
    logger.error('Failed to initialize Code Watcher:', error);
    process.exit(1);
  }
}

// Start the application
main().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});