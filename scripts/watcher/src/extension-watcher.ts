import * as path from 'path';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import { glob } from 'glob';
import chokidar from 'chokidar';
import logger from './utils/logger.js';
import config from './config.js';

/**
 * Tracks files with the same basename but different extensions.
 * Emits events when duplicates are found or resolved.
 */
export class FileExtensionWatcher extends EventEmitter {
  private filesByBasename: Map<string, string[]> = new Map();
  private watcher: chokidar.FSWatcher | null = null;
  
  /**
   * Process a file and check for duplicates
   */
  async processFile(filePath: string): Promise<void> {
    const parsedPath = path.parse(filePath);
    const basename = parsedPath.name;
    
    // Skip hidden files (starting with .)
    if (basename.startsWith('.')) {
      return;
    }
    
    // Add file if it's not already tracked
    const existingFiles = this.filesByBasename.get(basename) || [];
    if (!existingFiles.includes(filePath)) {
      existingFiles.push(filePath);
      this.filesByBasename.set(basename, existingFiles);
      
      // Check if we have duplicates
      if (existingFiles.length > 1) {
        this.reportDuplicates(basename);
        this.emit('duplicate', basename, existingFiles);
      }
    }
  }
  
  /**
   * Remove a file from tracking
   */
  removeFile(filePath: string): void {
    const parsedPath = path.parse(filePath);
    const basename = parsedPath.name;
    
    // Remove the file if it exists in our tracking
    const existingFiles = this.filesByBasename.get(basename);
    if (existingFiles) {
      const updatedFiles = existingFiles.filter(f => f !== filePath);
      
      if (updatedFiles.length === 0) {
        this.filesByBasename.delete(basename);
      } else {
        this.filesByBasename.set(basename, updatedFiles);
        
        // If we still have duplicates, report them
        if (updatedFiles.length > 1) {
          this.reportDuplicates(basename);
          this.emit('duplicate', basename, updatedFiles);
        } else {
          this.emit('duplicate-resolved', basename, updatedFiles[0]);
        }
      }
    }
  }
  
  /**
   * Report files with the same name but different extensions
   */
  private reportDuplicates(basename: string): void {
    const files = this.filesByBasename.get(basename) || [];
    if (files.length <= 1) return;
    
    logger.duplicateWarning(basename, files);
  }
  
  /**
   * Scan a directory to build file index
   */
  async scanDirectory(directory: string): Promise<void> {
    logger.info(`Scanning directory: ${directory}`);
    
    const pattern = path.join(directory, '**', '*.*');
    const ignorePattern = config.ignorePatterns.map(p => `**/${p}/**`);
    
    try {
      const files = await glob(pattern, { 
        ignore: ignorePattern,
        nodir: true
      });
      
      // Process all files
      for (const file of files) {
        await this.processFile(file);
      }
      
      // Report stats
      let duplicateCount = 0;
      
      for (const [basename, files] of this.filesByBasename.entries()) {
        if (files.length > 1) {
          duplicateCount++;
        }
      }
      
      logger.info(`Initial scan complete. Found ${duplicateCount} duplicate file names.`);
    } catch (error) {
      logger.error(`Error scanning directory ${directory}:`, error);
    }
  }
  
  /**
   * Start watching for file changes
   */
  startWatching(): void {
    const paths = config.watchPaths;
    
    if (paths.length === 0) {
      logger.warn('No watch paths specified. Extension watcher will not start.');
      return;
    }
    
    logger.info(`Starting file extension watcher for: ${paths.join(', ')}`);
    
    const watchOptions = {
      ignored: config.ignorePatterns.map(pattern => 
        pattern.includes('/') ? pattern : `**/${pattern}/**`
      ),
      persistent: true,
      ignoreInitial: true
    };
    
    this.watcher = chokidar.watch(paths, watchOptions);
    
    this.watcher
      .on('add', async (filePath) => {
        logger.debug(`File added: ${filePath}`);
        await this.processFile(filePath);
      })
      .on('change', async (filePath) => {
        // We don't need to do anything on change, as the basename remains the same
        logger.debug(`File changed: ${filePath}`);
      })
      .on('unlink', (filePath) => {
        logger.debug(`File removed: ${filePath}`);
        this.removeFile(filePath);
      });
    
    logger.info('File extension watcher started');
  }
  
  /**
   * Stop watching for file changes
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      logger.info('File extension watcher stopped');
    }
  }
  
  /**
   * Get all currently tracked duplicates
   */
  getDuplicates(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    
    for (const [basename, files] of this.filesByBasename.entries()) {
      if (files.length > 1) {
        result[basename] = [...files];
      }
    }
    
    return result;
  }
}

// Export a singleton instance
export const extensionWatcher = new FileExtensionWatcher();
export default extensionWatcher;