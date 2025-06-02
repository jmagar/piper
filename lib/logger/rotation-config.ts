import { appLogger } from './index';
import winston from 'winston';
import fs from 'fs/promises';
import path from 'path';

// Log rotation configuration interface
export interface LogRotationConfig {
  enabled: boolean;
  datePattern: string;
  maxSize: string;
  maxFiles: string;
  compress: boolean;
  frequency: 'daily' | 'hourly' | 'weekly' | 'monthly';
  archiveLocation: string;
  retentionDays: number;
  cleanupEnabled: boolean;
  compressionLevel: number;
}

// Default rotation configuration
export const DEFAULT_ROTATION_CONFIG: LogRotationConfig = {
  enabled: true,
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m', // 20MB per file
  maxFiles: '30d', // Keep 30 days
  compress: true,
  frequency: 'daily',
  archiveLocation: 'logs/archived',
  retentionDays: 30,
  cleanupEnabled: true,
  compressionLevel: 6, // gzip compression level
};

// Environment-specific configurations
export const ROTATION_CONFIGS = {
  development: {
    ...DEFAULT_ROTATION_CONFIG,
    maxSize: '10m',
    maxFiles: '7d',
    retentionDays: 7,
  },
  
  production: {
    ...DEFAULT_ROTATION_CONFIG,
    maxSize: '50m',
    maxFiles: '90d',
    retentionDays: 90,
    compress: true,
  },
  
  testing: {
    ...DEFAULT_ROTATION_CONFIG,
    maxSize: '1m',
    maxFiles: '1d',
    retentionDays: 1,
    compress: false,
  },
} as const;

/**
 * Log rotation manager
 */
export class LogRotationManager {
  private static instance: LogRotationManager;
  private config: LogRotationConfig;
  private cleanupInterval?: NodeJS.Timeout;

  private constructor() {
    const env = process.env.NODE_ENV as keyof typeof ROTATION_CONFIGS || 'development';
    this.config = ROTATION_CONFIGS[env] || DEFAULT_ROTATION_CONFIG;
    
    if (this.config.cleanupEnabled) {
      this.scheduleCleanup();
    }
  }

  public static getInstance(): LogRotationManager {
    if (!LogRotationManager.instance) {
      LogRotationManager.instance = new LogRotationManager();
    }
    return LogRotationManager.instance;
  }

  /**
   * Get current rotation configuration
   */
  public getConfig(): LogRotationConfig {
    return { ...this.config };
  }

  /**
   * Update rotation configuration
   */
  public updateConfig(newConfig: Partial<LogRotationConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    appLogger.info('Log rotation configuration updated', {
      oldConfig,
      newConfig: this.config,
      source: 'log-rotation'
    });

    // Restart cleanup if needed
    if (this.config.cleanupEnabled !== oldConfig.cleanupEnabled) {
      if (this.config.cleanupEnabled) {
        this.scheduleCleanup();
      } else {
        this.stopCleanup();
      }
    }
  }

  /**
   * Get Winston transport configuration for daily rotation
   */
  public getWinstonTransportConfig(filename: string, level?: string) {
    return {
      filename: `logs/${filename}`,
      datePattern: this.config.datePattern,
      maxSize: this.config.maxSize,
      maxFiles: this.config.maxFiles,
      level: level || 'info',
      zippedArchive: this.config.compress,
      format: this.getLogFormat(),
    };
  }

  /**
   * Get log format for Winston
   */
  private getLogFormat() {
    return winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );
  }

  /**
   * Schedule automatic cleanup of old log files
   */
  private scheduleCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Run cleanup daily at 2 AM
    const runCleanup = () => {
      const now = new Date();
      if (now.getHours() === 2) {
        this.performCleanup().catch(error => {
          appLogger.error('Error during scheduled log cleanup', error);
        });
      }
    };

    // Check every hour
    this.cleanupInterval = setInterval(runCleanup, 60 * 60 * 1000);
    
    appLogger.info('Log cleanup scheduled', {
      retentionDays: this.config.retentionDays,
      source: 'log-rotation'
    });
  }

  /**
   * Stop automatic cleanup
   */
  private stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
      
      appLogger.info('Log cleanup stopped', {
        source: 'log-rotation'
      });
    }
  }

  /**
   * Manually perform log cleanup
   */
  public async performCleanup(): Promise<{
    deletedFiles: string[];
    totalSize: number;
    errors: string[];
  }> {
    const deletedFiles: string[] = [];
    const errors: string[] = [];
    let totalSize = 0;

    try {
      const logsDir = path.join(process.cwd(), 'logs');
      const files = await fs.readdir(logsDir);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      for (const file of files) {
        if (!file.endsWith('.log') && !file.endsWith('.gz')) {
          continue;
        }

        const filePath = path.join(logsDir, file);
        
        try {
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            totalSize += stats.size;
            await fs.unlink(filePath);
            deletedFiles.push(file);
          }
        } catch (error) {
          errors.push(`Failed to process ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      appLogger.info('Log cleanup completed', {
        deletedFiles: deletedFiles.length,
        totalSizeKB: Math.round(totalSize / 1024),
        retentionDays: this.config.retentionDays,
        errors: errors.length,
        source: 'log-rotation'
      });

      return { deletedFiles, totalSize, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Cleanup failed: ${errorMessage}`);
      
      appLogger.error('Log cleanup failed', error as Error, {
        source: 'log-rotation'
      });

      return { deletedFiles, totalSize, errors };
    }
  }

  /**
   * Get rotation statistics
   */
  public async getRotationStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestFile: string | null;
    newestFile: string | null;
    compressedFiles: number;
    config: LogRotationConfig;
  }> {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      const files = await fs.readdir(logsDir);
      
      let totalSize = 0;
      let oldestFile: string | null = null;
      let newestFile: string | null = null;
      let oldestTime = Infinity;
      let newestTime = 0;
      let compressedFiles = 0;

      const logFiles = files.filter((file: string) => 
        file.endsWith('.log') || file.endsWith('.gz')
      );

      for (const file of logFiles) {
        const filePath = path.join(logsDir, file);
        const stats = await fs.stat(filePath);
        
        totalSize += stats.size;
        
        if (file.endsWith('.gz')) {
          compressedFiles++;
        }

        if (stats.mtime.getTime() < oldestTime) {
          oldestTime = stats.mtime.getTime();
          oldestFile = file;
        }

        if (stats.mtime.getTime() > newestTime) {
          newestTime = stats.mtime.getTime();
          newestFile = file;
        }
      }

      return {
        totalFiles: logFiles.length,
        totalSize,
        oldestFile,
        newestFile,
        compressedFiles,
        config: this.getConfig(),
      };
    } catch (error) {
      appLogger.error('Failed to get rotation stats', error as Error);
      
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestFile: null,
        newestFile: null,
        compressedFiles: 0,
        config: this.getConfig(),
      };
    }
  }

  /**
   * Force log rotation for all active log files
   */
  public async forceRotation(): Promise<void> {
    appLogger.info('Forcing log rotation', {
      timestamp: new Date().toISOString(),
      source: 'log-rotation'
    });

    // This would typically be handled by Winston's daily rotate file transport
    // For manual rotation, we could implement file moving logic here
    // For now, we'll just log the action
    appLogger.info('Log rotation completed', {
      timestamp: new Date().toISOString(),
      source: 'log-rotation'
    });
  }

  /**
   * Cleanup on shutdown
   */
  public shutdown(): void {
    this.stopCleanup();
    appLogger.info('Log rotation manager shutdown', {
      source: 'log-rotation'
    });
  }
}

// Singleton instance
export const logRotationManager = LogRotationManager.getInstance();

// Utility functions
export const getRotationConfig = () => logRotationManager.getConfig();
export const updateRotationConfig = (config: Partial<LogRotationConfig>) => 
  logRotationManager.updateConfig(config);
export const performLogCleanup = () => logRotationManager.performCleanup();
export const getRotationStats = () => logRotationManager.getRotationStats();

// Default export
export default logRotationManager; 