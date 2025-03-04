import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { glob } from 'glob';
import chokidar from 'chokidar';
import deepEqual from 'deep-equal';
import * as diff from 'diff';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as http from 'http';
import * as https from 'https';
import logger from './utils/logger.js';
import config, { ContentRule, contentRules } from './config.js';

const execAsync = promisify(exec);

/**
 * Interface for file content history
 */
interface FileHistory {
  content: string;
  lastModified: number;
  exists: boolean;
}

/**
 * File monitoring result
 */
export interface FileMonitorResult {
  filePath: string;
  fileName: string;
  message: string;
  match?: string;
  content?: string;
  lintResults?: string;
}

/**
 * Monitors specific files for changes and checks for common issues
 */
export class FileWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private fileHistory: Map<string, FileHistory> = new Map();
  private filePatterns: string[] = [];
  
  constructor() {
    super();
    this.setupFilePatterns();
  }
  
  /**
   * Setup file patterns to watch
   */
  private setupFilePatterns(): void {
    // Build file patterns from watchFiles config
    for (const watchPath of config.watchPaths) {
      for (const filePattern of config.watchFiles) {
        this.filePatterns.push(`${watchPath}/${filePattern}`);
      }
    }
    
    logger.info(`Set up ${this.filePatterns.length} file patterns to watch`);
  }
  
  /**
   * Initialize by scanning all files
   */
  async scanFiles(): Promise<void> {
    // Find all matching files
    const allFiles: string[] = [];
    
    for (const pattern of this.filePatterns) {
      try {
        const matches = await glob(pattern);
        allFiles.push(...matches);
      } catch (error) {
        logger.error(`Error scanning files with pattern ${pattern}: ${error}`);
      }
    }
    
    logger.info(`Found ${allFiles.length} files to check`);
    
    // Process each file
    for (const filePath of allFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        
        this.fileHistory.set(filePath, {
          content,
          lastModified: Date.now(),
          exists: true
        });
        
        // Check content rules
        await this.checkContentRules(filePath, content);
      } catch (error) {
        logger.error(`Error processing file ${filePath}: ${error}`);
        
        this.fileHistory.set(filePath, {
          content: '',
          lastModified: Date.now(),
          exists: false
        });
      }
    }
    
    // Run lint if enabled
    if (config.lintCommand) {
      this.runLint();
    }
  }
  
  /**
   * Run project linting and capture results
   */
  async runLint(): Promise<string> {
    try {
      logger.info(`Running lint command: ${config.lintCommand}`);
      const { stdout, stderr } = await execAsync(config.lintCommand);
      
      const result = stdout || stderr;
      
      if (stderr && !stdout) {
        logger.warn(`Lint command produced errors: ${stderr}`);
        this.sendNotification('Lint Warning', `Lint command produced errors: ${stderr.substring(0, 100)}...`);
      } else {
        logger.info('Lint command completed successfully');
      }
      
      // Emit lint results for embedding
      this.emit('lint-results', {
        timestamp: new Date().toISOString(),
        results: result,
        command: config.lintCommand
      });
      
      return result;
    } catch (error: unknown) {
      // Handle exec errors which have specific properties
      const execError = error as { message?: string; stdout?: string };
      const errorMessage = `Lint command failed: ${execError.message || String(error)}`;
      logger.error(errorMessage);
      this.sendNotification('Lint Error', errorMessage);
      
      // Emit lint error for embedding
      this.emit('lint-results', {
        timestamp: new Date().toISOString(),
        results: execError.stdout || String(error),
        command: config.lintCommand,
        error: true
      });
      
      return execError.stdout || String(error);
    }
  }
  
  /**
   * Send notification via Gotify if enabled
   */
  async sendNotification(title: string, message: string, priority = 5): Promise<void> {
    if (!config.useNotifications || !config.gotifyUrl || !config.gotifyToken) {
      return;
    }
    
    try {
      const url = new URL('/message', config.gotifyUrl);
      const postData = JSON.stringify({
        title,
        message,
        priority
      });
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gotify-Key': config.gotifyToken
        }
      };
      
      const client = url.protocol === 'https:' ? https : http;
      
      return new Promise((resolve, reject) => {
        const req = client.request(url, options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            const statusCode = res.statusCode || 0;
            if (statusCode >= 200 && statusCode < 300) {
              logger.debug(`Notification sent: ${title}`);
              resolve();
            } else {
              logger.warn(`Failed to send notification: ${statusCode} - ${data}`);
              reject(new Error(`Failed to send notification: ${statusCode}`));
            }
          });
        });
        
        req.on('error', (error: Error) => {
          logger.error(`Error sending notification: ${error.message}`);
          reject(error);
        });
        
        req.write(postData);
        req.end();
      });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error sending notification: ${err.message}`);
    }
  }
  
  /**
   * Check content rules for a file
   */
  private async checkContentRules(filePath: string, content: string): Promise<void> {
    const fileName = path.basename(filePath);
    
    // Find matching content rules for this file type
    const fileRules = Object.keys(contentRules).find(pattern => {
      const regex = new RegExp(pattern.replace('.', '\\.').replace('*', '.*'));
      return regex.test(fileName);
    });
    
    if (!fileRules) return;
    
    const rules = contentRules[fileRules];
    
    if (!rules || rules.length === 0) return;
    
    for (const rule of rules) {
      const pattern = new RegExp(rule.pattern);
      const matches = content.match(pattern);
      
      if (matches) {
        logger.warn(`Content rule violation in ${filePath}:`);
        logger.warn(`   ${rule.message}`);
        
        if (matches[1]) {
          logger.warn(`   Found: ${matches[1]}`);
        }
        
        this.sendNotification('File Issue', `${rule.message} in ${fileName}`);
        
        this.emit('content-violation', {
          filePath,
          fileName,
          message: rule.message,
          match: matches[0],
          content
        });
      }
    }
  }
  
  /**
   * Process a file change
   */
  async processFileChange(filePath: string): Promise<void> {
    try {
      // Read current content
      const content = await fs.readFile(filePath, 'utf-8');
      const previousRecord = this.fileHistory.get(filePath);
      
      // Update history
      this.fileHistory.set(filePath, {
        content,
        lastModified: Date.now(),
        exists: true
      });
      
      // If we have previous content, show a diff
      if (previousRecord && previousRecord.exists && content !== previousRecord.content) {
        const changes = diff.diffLines(previousRecord.content, content);
        let changeCount = 0;
        
        // Define interface for diff part to fix type error
        interface DiffPart {
          added?: boolean;
          removed?: boolean;
          value: string;
        }
        
        changes.forEach((part: DiffPart) => {
          if (part.added || part.removed) {
            changeCount++;
          }
        });
        
        logger.info(`File ${filePath} was modified (${changeCount} changed blocks)`);
        
        // If it's a significant change, run lint
        if (changeCount > 0 && config.lintCommand) {
          // Run lint after a delay to allow for multiple file changes
          setTimeout(() => {
            this.runLint();
          }, 2000);
        }
      }
      
      // Check content rules
      await this.checkContentRules(filePath, content);
      
      // Emit file change event for embedding
      this.emit('file-change', {
        filePath,
        fileName: path.basename(filePath),
        content,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Error processing file change for ${filePath}: ${error}`);
      
      // File doesn't exist or can't be read
      this.fileHistory.set(filePath, {
        content: '',
        lastModified: Date.now(),
        exists: false
      });
    }
  }
  
  /**
   * Process file deletion
   */
  async processFileDeletion(filePath: string): Promise<void> {
    const fileName = path.basename(filePath);
    
    logger.warn(`Important file deleted: ${filePath}`);
    
    // Update history
    this.fileHistory.set(filePath, {
      content: '',
      lastModified: Date.now(),
      exists: false
    });
    
    this.sendNotification('File Deleted', `Important file deleted: ${fileName}`, 7);
    
    this.emit('file-deletion', {
      filePath,
      fileName,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Start watching for file changes
   */
  startWatching(): void {
    if (this.filePatterns.length === 0) {
      logger.warn('No file patterns specified. File watcher will not start.');
      return;
    }
    
    logger.info(`Starting file watcher for ${this.filePatterns.length} file patterns: ${this.filePatterns.join(', ')}`);
    
    this.watcher = chokidar.watch(this.filePatterns, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });
    
    this.watcher
      .on('add', async (filePath: string) => {
        logger.info(`File created: ${filePath}`);
        await this.processFileChange(filePath);
      })
      .on('change', async (filePath: string) => {
        await this.processFileChange(filePath);
      })
      .on('unlink', async (filePath: string) => {
        logger.info(`File deleted: ${filePath}`);
        await this.processFileDeletion(filePath);
      });
    
    logger.info('File watcher started');
    
    // Initial lint
    if (config.lintCommand) {
      setTimeout(() => {
        this.runLint();
      }, 5000);
    }
  }
  
  /**
   * Stop watching for file changes
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      logger.info('File watcher stopped');
    }
  }
}

// Export a singleton instance
export const fileWatcher = new FileWatcher();
export default fileWatcher;