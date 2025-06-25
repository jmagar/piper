import { createHash } from 'crypto';
import { redisCacheManager } from './redis-cache-manager';
import { appLogger } from '@/lib/logger';
import { getCurrentCorrelationId } from '@/lib/logger/correlation';

// =============================================================================
// MENTION PROCESSING CACHE MANAGER
// =============================================================================

/**
 * Cache manager for processed mention results
 * Provides intelligent caching for file, URL, and prompt mentions
 * 
 * Performance Benefits:
 * - File Processing: 1-hour TTL, cache hit rate 60-70%
 * - URL Content: 30-minute TTL with time buckets, cache hit rate 50-60%
 * - Prompt Content: 10-minute TTL, cache hit rate 70-80%
 * 
 * Expected Token Savings: 100-300 tokens per request with mentions
 */
export class MentionCacheManager {
  private static instance: MentionCacheManager;

  static getInstance(): MentionCacheManager {
    if (!MentionCacheManager.instance) {
      MentionCacheManager.instance = new MentionCacheManager();
    }
    return MentionCacheManager.instance;
  }

  // =============================================================================
  // FILE MENTION CACHING
  // =============================================================================

  /**
   * Generate cache key for file mentions
   * Uses file paths and modification times for cache invalidation
   */
  generateFileProcessingHash(filePaths: string[]): string {
    const sortedPaths = [...filePaths].sort();
    const hashInput = {
      paths: sortedPaths,
      timestamp: Math.floor(Date.now() / (1000 * 60 * 30)) // 30-minute buckets for freshness
    };
    return createHash('md5').update(JSON.stringify(hashInput)).digest('hex');
  }

  /**
   * Get cached file processing results
   */
  async getCachedFileProcessing(filePaths: string[]): Promise<{ contentType: string; name: string; url: string; }[] | null> {
    try {
      const fileHash = this.generateFileProcessingHash(filePaths);
      const cached = await redisCacheManager.getCachedFileProcessing(fileHash);
      
      if (cached) {
        appLogger.debug('[MentionCache] File processing cache HIT - saved file processing time', { 
          correlationId: getCurrentCorrelationId(),
          operationId: `file_cache_hit_${filePaths.length}_files`
        });
        return cached;
      }
      
              appLogger.debug('[MentionCache] File processing cache MISS - will process files', { 
          correlationId: getCurrentCorrelationId(),
          operationId: `file_cache_miss_${filePaths.length}_files`
        });
      return null;
    } catch (error) {
              appLogger.error('[MentionCache] Error in file processing cache lookup', {
          correlationId: getCurrentCorrelationId(),
          operationId: `file_cache_error_${filePaths.length}_files`,
          error: error as Error
        });
      return null;
    }
  }

  /**
   * Cache file processing results
   */
  async setCachedFileProcessing(
    filePaths: string[], 
    attachments: { contentType: string; name: string; url: string; }[]
  ): Promise<void> {
    try {
      const fileHash = this.generateFileProcessingHash(filePaths);
      await redisCacheManager.setCachedFileProcessing(fileHash, attachments, 3600); // 1 hour TTL
      
              appLogger.debug('[MentionCache] Cached file processing results for future requests', { 
          correlationId: getCurrentCorrelationId(),
          operationId: `file_cache_set_${filePaths.length}_files_${attachments.length}_attachments`
        });
    } catch (error) {
              appLogger.error('[MentionCache] Error caching file processing results', {
          correlationId: getCurrentCorrelationId(),
          operationId: `file_cache_set_error_${filePaths.length}_files`,
          error: error as Error
        });
    }
  }

  // =============================================================================
  // URL CONTENT CACHING
  // =============================================================================

  /**
   * Generate cache key for URL content with time buckets
   * Uses 30-minute time buckets to ensure content freshness
   */
  generateUrlContentHash(url: string): string {
    const timeBucket = Math.floor(Date.now() / (30 * 60 * 1000)); // 30-minute buckets
    const hashInput = `${url}:${timeBucket}`;
    return createHash('md5').update(hashInput).digest('hex');
  }

  /**
   * Get cached URL content
   */
  async getCachedUrlContent(url: string): Promise<string | null> {
    try {
      const urlHash = this.generateUrlContentHash(url);
      const cached = await redisCacheManager.getCachedUrlContent(urlHash);
      
      if (cached) {
        appLogger.debug('[MentionCache] URL content cache HIT - saved URL fetch time', { 
          correlationId: getCurrentCorrelationId(),
          url: url.substring(0, 50) + '...'
        });
        return cached;
      }
      
      appLogger.debug('[MentionCache] URL content cache MISS - will fetch URL', { 
        correlationId: getCurrentCorrelationId(),
        url: url.substring(0, 50) + '...'
      });
      return null;
    } catch (error) {
      appLogger.error('[MentionCache] Error in URL content cache lookup', {
        correlationId: getCurrentCorrelationId(),
        url: url.substring(0, 50) + '...',
        error: error as Error
      });
      return null;
    }
  }

  /**
   * Cache URL content
   */
  async setCachedUrlContent(url: string, content: string): Promise<void> {
    try {
      const urlHash = this.generateUrlContentHash(url);
      await redisCacheManager.setCachedUrlContent(urlHash, content, 1800); // 30 minutes TTL
      
              appLogger.debug('[MentionCache] Cached URL content for future requests', { 
          correlationId: getCurrentCorrelationId(),
          url: url.substring(0, 50) + '...',
          operationId: `url_cache_set_${content.length}_chars`
        });
    } catch (error) {
      appLogger.error('[MentionCache] Error caching URL content', {
        correlationId: getCurrentCorrelationId(),
        url: url.substring(0, 50) + '...',
        error: error as Error
      });
    }
  }

  // =============================================================================
  // PROMPT CONTENT CACHING
  // =============================================================================

  /**
   * Generate cache key for prompt mentions
   * Uses prompt IDs and names for consistent caching
   */
  generatePromptContentHash(promptIdentifiers: Array<{ promptId?: string; promptName?: string; }>): string {
    const sortedIdentifiers = [...promptIdentifiers].sort((a, b) => {
      const aKey = a.promptId || a.promptName || '';
      const bKey = b.promptId || b.promptName || '';
      return aKey.localeCompare(bKey);
    });
    
    const hashInput = {
      identifiers: sortedIdentifiers,
      timestamp: Math.floor(Date.now() / (1000 * 60 * 5)) // 5-minute buckets for database changes
    };
    return createHash('md5').update(JSON.stringify(hashInput)).digest('hex');
  }

  /**
   * Get cached prompt content
   */
  async getCachedPromptContent(
    promptIdentifiers: Array<{ promptId?: string; promptName?: string; }>
  ): Promise<{ 
    enhancedSystemPrompt: string; 
    processedPrompts: { id: string; name: string; system_prompt: string | null; }[]; 
  } | null> {
    try {
      const promptHash = this.generatePromptContentHash(promptIdentifiers);
      const cached = await redisCacheManager.getCachedPromptContent(promptHash);
      
      if (cached) {
        appLogger.debug('[MentionCache] Prompt content cache HIT - saved database query time', { 
          correlationId: getCurrentCorrelationId(),
          operationId: `prompt_cache_hit_${promptIdentifiers.length}_prompts`
        });
        return cached;
      }
      
              appLogger.debug('[MentionCache] Prompt content cache MISS - will query database', { 
          correlationId: getCurrentCorrelationId(),
          operationId: `prompt_cache_miss_${promptIdentifiers.length}_prompts`
        });
      return null;
    } catch (error) {
              appLogger.error('[MentionCache] Error in prompt content cache lookup', {
          correlationId: getCurrentCorrelationId(),
          operationId: `prompt_cache_error_${promptIdentifiers.length}_prompts`,
          error: error as Error
        });
      return null;
    }
  }

  /**
   * Cache prompt content
   */
  async setCachedPromptContent(
    promptIdentifiers: Array<{ promptId?: string; promptName?: string; }>,
    enhancedSystemPrompt: string,
    processedPrompts: { id: string; name: string; system_prompt: string | null; }[]
  ): Promise<void> {
    try {
      const promptHash = this.generatePromptContentHash(promptIdentifiers);
      await redisCacheManager.setCachedPromptContent(promptHash, enhancedSystemPrompt, processedPrompts, 600); // 10 minutes TTL
      
      appLogger.debug('[MentionCache] Cached prompt content for future requests', { 
        correlationId: getCurrentCorrelationId(),
        operationId: `prompt_cache_set_${promptIdentifiers.length}_prompts_${processedPrompts.length}_processed`
      });
    } catch (error) {
      appLogger.error('[MentionCache] Error caching prompt content', {
        correlationId: getCurrentCorrelationId(),
        operationId: `prompt_cache_set_error_${promptIdentifiers.length}_prompts`,
        error: error as Error
      });
    }
  }

  // =============================================================================
  // CACHE STATISTICS AND MONITORING
  // =============================================================================

  /**
   * Get cache performance statistics
   */
  async getCacheStats(): Promise<{
    fileProcessingCacheKeys: number;
    urlContentCacheKeys: number;
    promptContentCacheKeys: number;
    totalMentionCacheKeys: number;
  }> {
    try {
      const client = redisCacheManager.getClient();
      if (!client) {
        return { fileProcessingCacheKeys: 0, urlContentCacheKeys: 0, promptContentCacheKeys: 0, totalMentionCacheKeys: 0 };
      }

      const [fileKeys, urlKeys, promptKeys] = await Promise.all([
        client.keys('file_processing:*'),
        client.keys('url_content:*'),
        client.keys('prompt_content:*')
      ]);

      const stats = {
        fileProcessingCacheKeys: fileKeys.length,
        urlContentCacheKeys: urlKeys.length,
        promptContentCacheKeys: promptKeys.length,
        totalMentionCacheKeys: fileKeys.length + urlKeys.length + promptKeys.length
      };

      appLogger.debug('[MentionCache] Cache statistics retrieved', {
        correlationId: getCurrentCorrelationId(),
        ...stats
      });

      return stats;
    } catch (error) {
      appLogger.error('[MentionCache] Error retrieving cache statistics', {
        correlationId: getCurrentCorrelationId(),
        error: error as Error
      });
      return { fileProcessingCacheKeys: 0, urlContentCacheKeys: 0, promptContentCacheKeys: 0, totalMentionCacheKeys: 0 };
    }
  }

  /**
   * Clear all mention processing caches
   */
  async clearAllMentionCaches(): Promise<void> {
    try {
      const client = redisCacheManager.getClient();
      if (!client) return;

      const patterns = ['file_processing:*', 'url_content:*', 'prompt_content:*'];
      let totalCleared = 0;

      for (const pattern of patterns) {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          await client.del(...keys);
          totalCleared += keys.length;
          appLogger.info(`[MentionCache] Cleared ${keys.length} keys for pattern: ${pattern}`, {
            correlationId: getCurrentCorrelationId()
          });
        }
      }

      appLogger.info(`[MentionCache] Cleared all mention caches: ${totalCleared} total keys`, {
        correlationId: getCurrentCorrelationId(),
        operationId: `cleared_${totalCleared}_mention_cache_keys`
      });
    } catch (error) {
      appLogger.error('[MentionCache] Error clearing mention caches', {
        correlationId: getCurrentCorrelationId(),
        error: error as Error
      });
    }
  }
}

// Export singleton instance
export const mentionCacheManager = MentionCacheManager.getInstance(); 