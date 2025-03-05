import axios from 'axios';
import { McpMarketplaceItem, McpMarketplaceCatalog, McpDownloadResponse } from '../../../shared-mcp';

const API_BASE_URL = '/api/mcp';

/**
 * API client for the MCP Marketplace
 */
export class McpMarketplaceAPI {
  /**
   * Get the marketplace catalog with optional filters
   */
  static async getCatalog(options?: {
    category?: string;
    tag?: string;
    search?: string;
    sort?: 'newest' | 'stars' | 'downloads' | 'name';
    refresh?: boolean;
  }): Promise<McpMarketplaceCatalog> {
    const { category, tag, search, sort, refresh } = options || {};
    
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (tag) params.append('tag', tag);
    if (search) params.append('search', search);
    if (sort) params.append('sort', sort);
    if (refresh) params.append('refresh', 'true');
    
    const response = await axios.get<McpMarketplaceCatalog>(
      `${API_BASE_URL}/marketplace?${params.toString()}`
    );
    
    return response.data;
  }
  
  /**
   * Get a specific marketplace item by ID
   */
  static async getItem(mcpId: string, refresh = false): Promise<McpMarketplaceItem> {
    const params = new URLSearchParams();
    if (refresh) params.append('refresh', 'true');
    
    const response = await axios.get<McpMarketplaceItem>(
      `${API_BASE_URL}/marketplace/${mcpId}?${params.toString()}`
    );
    
    return response.data;
  }
  
  /**
   * Download and install an MCP server
   */
  static async downloadMcp(mcpId: string): Promise<McpDownloadResponse> {
    const response = await axios.post<McpDownloadResponse>(
      `${API_BASE_URL}/marketplace/${mcpId}/download`
    );
    
    return response.data;
  }
  
  /**
   * Get marketplace statistics
   */
  static async getStats(refresh = false): Promise<any> {
    const params = new URLSearchParams();
    if (refresh) params.append('refresh', 'true');
    
    const response = await axios.get<any>(
      `${API_BASE_URL}/marketplace/stats?${params.toString()}`
    );
    
    return response.data;
  }
  
  /**
   * Check if an MCP server is installed
   */
  static async isInstalled(mcpId: string): Promise<boolean> {
    try {
      const response = await axios.get(`${API_BASE_URL}/servers/${mcpId}`);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}
