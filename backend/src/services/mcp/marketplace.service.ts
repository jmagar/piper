import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import debug from 'debug';
import { McpMarketplaceItem, McpMarketplaceCatalog, McpDownloadResponse } from '../../../shared-mcp.js';

const log = debug('pooper:mcp:marketplace');
const error = debug('pooper:mcp:marketplace:error');

// Cache keys
const MARKETPLACE_CATALOG_KEY = 'mcp:marketplace:catalog';
const MARKETPLACE_ITEM_KEY_PREFIX = 'mcp:marketplace:item:';
const MARKETPLACE_STATS_KEY = 'mcp:marketplace:stats';
const DOWNLOAD_COUNT_KEY_PREFIX = 'mcp:marketplace:downloads:';

// Cache TTLs in seconds
const CATALOG_TTL = 3600; // 1 hour
const ITEM_TTL = 3600; // 1 hour
const STATS_TTL = 3600; // 1 hour

export class McpMarketplaceService {
  private redisClient;
  
  constructor(private prisma: PrismaClient) {
    // Initialize Redis client
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:7654',
    });
    
    this.redisClient.on('error', (err) => {
      error('Redis client error:', err);
    });
    
    // Connect to Redis
    this.connectToRedis();
  }
  
  private async connectToRedis(): Promise<void> {
    try {
      if (!this.redisClient.isOpen) {
        await this.redisClient.connect();
        log('Connected to Redis');
      }
    } catch (err) {
      error('Failed to connect to Redis:', err);
      // Retry connection after delay
      setTimeout(() => this.connectToRedis(), 5000);
    }
  }
  
  /**
   * Fetch the marketplace catalog from the remote source or cache
   */
  async getMarketplaceCatalog(options?: {
    category?: string;
    tag?: string;
    search?: string;
    sort?: 'newest' | 'stars' | 'downloads' | 'name';
    forceRefresh?: boolean;
  }): Promise<McpMarketplaceCatalog> {
    const { forceRefresh = false } = options || {};
    
    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
      try {
        const cachedCatalog = await this.redisClient.get(MARKETPLACE_CATALOG_KEY);
        if (cachedCatalog) {
          const catalog = JSON.parse(cachedCatalog) as McpMarketplaceCatalog;
          log('Retrieved marketplace catalog from cache');
          
          // Apply filters and sorting
          return this.filterAndSortCatalog(catalog, options);
        }
      } catch (err) {
        error('Error retrieving catalog from cache:', err);
      }
    }
    
    // Fetch from remote source
    try {
      // In a real implementation, this would fetch from a GitHub repository or API
      // For now, we'll use a mock implementation
      const catalog = await this.fetchMarketplaceCatalogFromRemote();
      
      // Cache the full catalog
      await this.redisClient.set(
        MARKETPLACE_CATALOG_KEY, 
        JSON.stringify(catalog),
        { EX: CATALOG_TTL }
      );
      
      log('Fetched and cached marketplace catalog');
      
      // Apply filters and sorting
      return this.filterAndSortCatalog(catalog, options);
    } catch (err) {
      error('Error fetching marketplace catalog:', err);
      throw new Error('Failed to fetch marketplace catalog');
    }
  }
  
  /**
   * Filter and sort the catalog based on options
   */
  private filterAndSortCatalog(
    catalog: McpMarketplaceCatalog,
    options?: {
      category?: string;
      tag?: string;
      search?: string;
      sort?: 'newest' | 'stars' | 'downloads' | 'name';
    }
  ): McpMarketplaceCatalog {
    let { items } = catalog;
    const { category, tag, search, sort } = options || {};
    
    // Apply filters
    if (category) {
      items = items.filter(item => item.category === category);
    }
    
    if (tag) {
      items = items.filter(item => item.tags.includes(tag));
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter((item: McpMarketplaceItem) => 
        item.name.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.author.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply sorting
    if (sort) {
      switch (sort) {
        case 'newest':
          items.sort((a: McpMarketplaceItem, b: McpMarketplaceItem) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'stars':
          items.sort((a: McpMarketplaceItem, b: McpMarketplaceItem) => b.githubStars - a.githubStars);
          break;
        case 'downloads':
          items.sort((a: McpMarketplaceItem, b: McpMarketplaceItem) => b.downloadCount - a.downloadCount);
          break;
        case 'name':
          items.sort((a: McpMarketplaceItem, b: McpMarketplaceItem) => a.name.localeCompare(b.name));
          break;
      }
    }
    
    return { items };
  }
  
  /**
   * Fetch a specific marketplace item by ID
   */
  async getMarketplaceItem(mcpId: string, forceRefresh = false): Promise<McpMarketplaceItem | null> {
    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
      try {
        const cachedItem = await this.redisClient.get(`${MARKETPLACE_ITEM_KEY_PREFIX}${mcpId}`);
        if (cachedItem) {
          log(`Retrieved marketplace item ${mcpId} from cache`);
          return JSON.parse(cachedItem) as McpMarketplaceItem;
        }
      } catch (err) {
        error(`Error retrieving item ${mcpId} from cache:`, err);
      }
    }
    
    // Fetch from catalog
    try {
      const catalog = await this.getMarketplaceCatalog();
      const item = catalog.items.find((i: McpMarketplaceItem) => i.mcpId === mcpId);
      
      if (item) {
        // Cache the item
        await this.redisClient.set(
          `${MARKETPLACE_ITEM_KEY_PREFIX}${mcpId}`,
          JSON.stringify(item),
          { EX: ITEM_TTL }
        );
        
        log(`Fetched and cached marketplace item ${mcpId}`);
        return item;
      }
      
      return null;
    } catch (err) {
      error(`Error fetching marketplace item ${mcpId}:`, err);
      throw new Error(`Failed to fetch marketplace item ${mcpId}`);
    }
  }
  
  /**
   * Download and install an MCP server
   */
  async downloadMcp(mcpId: string): Promise<McpDownloadResponse> {
    // Get the marketplace item
    const item = await this.getMarketplaceItem(mcpId);
    if (!item) {
      throw new Error(`MCP server ${mcpId} not found`);
    }
    
    try {
      // In a real implementation, this would download from GitHub and install
      // For now, we'll use a mock implementation
      const downloadResponse: McpDownloadResponse = {
        mcpId: item.mcpId,
        githubUrl: item.githubUrl,
        name: item.name,
        author: item.author,
        description: item.description,
        readmeContent: item.readmeContent || '',
        llmsInstallationContent: item.llmsInstallationContent || '',
        requiresApiKey: item.requiresApiKey
      };
      
      // Increment download count in Redis
      await this.incrementDownloadCount(mcpId);
      
      // Update download count in the catalog cache
      await this.updateCatalogItemDownloadCount(mcpId);
      
      log(`Downloaded and installed MCP server ${mcpId}`);
      return downloadResponse;
    } catch (err) {
      error(`Error downloading MCP server ${mcpId}:`, err);
      throw new Error(`Failed to download MCP server ${mcpId}`);
    }
  }
  
  /**
   * Increment the download count for an MCP server
   */
  private async incrementDownloadCount(mcpId: string): Promise<void> {
    try {
      await this.redisClient.incr(`${DOWNLOAD_COUNT_KEY_PREFIX}${mcpId}`);
      log(`Incremented download count for ${mcpId}`);
    } catch (err) {
      error(`Error incrementing download count for ${mcpId}:`, err);
    }
  }
  
  /**
   * Update the download count in the catalog cache
   */
  private async updateCatalogItemDownloadCount(mcpId: string): Promise<void> {
    try {
      const cachedCatalog = await this.redisClient.get(MARKETPLACE_CATALOG_KEY);
      if (cachedCatalog) {
        const catalog = JSON.parse(cachedCatalog) as McpMarketplaceCatalog;
        const item = catalog.items.find((i: McpMarketplaceItem) => i.mcpId === mcpId);
        
        if (item) {
          item.downloadCount += 1;
          
          // Update the catalog cache
          await this.redisClient.set(
            MARKETPLACE_CATALOG_KEY,
            JSON.stringify(catalog),
            { EX: CATALOG_TTL }
          );
          
          // Update the item cache
          await this.redisClient.set(
            `${MARKETPLACE_ITEM_KEY_PREFIX}${mcpId}`,
            JSON.stringify(item),
            { EX: ITEM_TTL }
          );
          
          log(`Updated download count for ${mcpId} in cache`);
        }
      }
    } catch (err) {
      error(`Error updating download count for ${mcpId} in cache:`, err);
    }
  }
  
  /**
   * Get marketplace statistics
   */
  async getMarketplaceStats(forceRefresh = false): Promise<any> {
    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
      try {
        const cachedStats = await this.redisClient.get(MARKETPLACE_STATS_KEY);
        if (cachedStats) {
          log('Retrieved marketplace stats from cache');
          return JSON.parse(cachedStats);
        }
      } catch (err) {
        error('Error retrieving stats from cache:', err);
      }
    }
    
    // Calculate stats
    try {
      const catalog = await this.getMarketplaceCatalog();
      
      // Calculate total downloads
      const totalDownloads = catalog.items.reduce((sum: number, item: McpMarketplaceItem) => sum + item.downloadCount, 0);
      
      // Calculate popular categories
      const categoryMap = new Map<string, number>();
      catalog.items.forEach((item: McpMarketplaceItem) => {
        const count = categoryMap.get(item.category) || 0;
        categoryMap.set(item.category, count + item.downloadCount);
      });
      
      const popularCategories = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Get top MCPs
      const topMcps = [...catalog.items]
        .sort((a: McpMarketplaceItem, b: McpMarketplaceItem) => b.downloadCount - a.downloadCount)
        .slice(0, 5)
        .map(item => ({
          mcpId: item.mcpId,
          name: item.name,
          downloads: item.downloadCount
        }));
      
      const stats = {
        totalDownloads,
        popularCategories,
        topMcps
      };
      
      // Cache the stats
      await this.redisClient.set(
        MARKETPLACE_STATS_KEY,
        JSON.stringify(stats),
        { EX: STATS_TTL }
      );
      
      log('Calculated and cached marketplace stats');
      return stats;
    } catch (err) {
      error('Error calculating marketplace stats:', err);
      throw new Error('Failed to calculate marketplace stats');
    }
  }
  
  /**
   * Mock implementation to fetch marketplace catalog from remote source
   */
  private async fetchMarketplaceCatalogFromRemote(): Promise<McpMarketplaceCatalog> {
    // In a real implementation, this would fetch from a GitHub repository or API
    // For now, we'll return mock data
    const mockItems: McpMarketplaceItem[] = [
      {
        mcpId: 'brave-search',
        githubUrl: 'https://github.com/cline/mcp-brave-search',
        name: 'Brave Search',
        author: 'Brave',
        description: 'Search the web with Brave Search API',
        codiconIcon: 'search',
        logoUrl: 'https://brave.com/static-assets/images/brave-logo-sans-text.svg',
        category: 'Search',
        tags: ['web', 'search', 'brave'],
        requiresApiKey: true,
        readmeContent: '# Brave Search MCP\n\nSearch the web with Brave Search API',
        llmsInstallationContent: 'Install with `npm install mcp-brave-search`',
        isRecommended: true,
        githubStars: 120,
        downloadCount: 450,
        createdAt: '2024-01-15T12:00:00Z',
        updatedAt: '2024-02-20T14:30:00Z',
        lastGithubSync: '2024-03-01T10:15:00Z'
      },
      {
        mcpId: 'openai-tools',
        githubUrl: 'https://github.com/cline/mcp-openai-tools',
        name: 'OpenAI Tools',
        author: 'OpenAI',
        description: 'Access OpenAI tools and models',
        codiconIcon: 'sparkle',
        logoUrl: 'https://openai.com/favicon.ico',
        category: 'AI',
        tags: ['ai', 'openai', 'gpt'],
        requiresApiKey: true,
        readmeContent: '# OpenAI Tools MCP\n\nAccess OpenAI tools and models',
        llmsInstallationContent: 'Install with `npm install mcp-openai-tools`',
        isRecommended: true,
        githubStars: 350,
        downloadCount: 780,
        createdAt: '2023-11-10T09:45:00Z',
        updatedAt: '2024-02-28T16:20:00Z',
        lastGithubSync: '2024-03-02T08:30:00Z'
      },
      {
        mcpId: 'github-tools',
        githubUrl: 'https://github.com/cline/mcp-github-tools',
        name: 'GitHub Tools',
        author: 'GitHub',
        description: 'Interact with GitHub repositories and issues',
        codiconIcon: 'github',
        logoUrl: 'https://github.com/favicon.ico',
        category: 'Developer',
        tags: ['github', 'git', 'developer'],
        requiresApiKey: true,
        readmeContent: '# GitHub Tools MCP\n\nInteract with GitHub repositories and issues',
        llmsInstallationContent: 'Install with `npm install mcp-github-tools`',
        isRecommended: true,
        githubStars: 280,
        downloadCount: 520,
        createdAt: '2023-12-05T14:20:00Z',
        updatedAt: '2024-02-15T11:10:00Z',
        lastGithubSync: '2024-03-01T09:45:00Z'
      },
      {
        mcpId: 'market-api',
        githubUrl: 'https://github.com/cline/mcp-market-api',
        name: 'Market API',
        author: 'FinanceHub',
        description: 'Access financial markets data and trading information',
        codiconIcon: 'graph',
        logoUrl: 'https://example.com/market-icon.png',
        category: 'Market',
        tags: ['finance', 'stocks', 'trading', 'economics'],
        requiresApiKey: true,
        readmeContent: '# Market API MCP\n\nAccess real-time and historical financial market data',
        llmsInstallationContent: 'Install with `npm install mcp-market-api`',
        isRecommended: true,
        githubStars: 310,
        downloadCount: 650,
        createdAt: '2024-01-10T11:25:00Z',
        updatedAt: '2024-02-28T09:45:00Z',
        lastGithubSync: '2024-03-02T10:30:00Z'
      },
      {
        mcpId: 'weather-api',
        githubUrl: 'https://github.com/cline/mcp-weather-api',
        name: 'Weather API',
        author: 'WeatherCo',
        description: 'Get weather forecasts and conditions',
        codiconIcon: 'cloud',
        logoUrl: 'https://example.com/weather-icon.png',
        category: 'Weather',
        tags: ['weather', 'forecast', 'api'],
        requiresApiKey: true,
        readmeContent: '# Weather API MCP\n\nGet weather forecasts and conditions',
        llmsInstallationContent: 'Install with `npm install mcp-weather-api`',
        isRecommended: false,
        githubStars: 85,
        downloadCount: 320,
        createdAt: '2024-01-20T10:30:00Z',
        updatedAt: '2024-02-25T13:15:00Z',
        lastGithubSync: '2024-03-02T11:20:00Z'
      },
      {
        mcpId: 'code-interpreter',
        githubUrl: 'https://github.com/cline/mcp-code-interpreter',
        name: 'Code Interpreter',
        author: 'CodeLabs',
        description: 'Execute code in various programming languages',
        codiconIcon: 'code',
        logoUrl: 'https://example.com/code-icon.png',
        category: 'Developer',
        tags: ['code', 'interpreter', 'programming'],
        requiresApiKey: false,
        readmeContent: '# Code Interpreter MCP\n\nExecute code in various programming languages',
        llmsInstallationContent: 'Install with `npm install mcp-code-interpreter`',
        isRecommended: true,
        githubStars: 420,
        downloadCount: 890,
        createdAt: '2023-10-15T08:45:00Z',
        updatedAt: '2024-03-01T15:30:00Z',
        lastGithubSync: '2024-03-03T09:10:00Z'
      }
    ];
    
    return { items: mockItems };
  }
  
  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.redisClient.isOpen) {
      await this.redisClient.quit();
      log('Disconnected from Redis');
    }
  }
}
