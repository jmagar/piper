import { Router, Request, Response } from 'express';
import { McpMarketplaceService } from '../services/mcp/marketplace.service.js';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const marketplaceService = new McpMarketplaceService(prisma);

/**
 * Get MCP marketplace catalog
 */
router.get('/marketplace', async (req: Request, res: Response) => {
  try {
    const { category, tag, search, sort, refresh } = req.query;
    
    const catalog = await marketplaceService.getMarketplaceCatalog({
      category: category as string,
      tag: tag as string,
      search: search as string,
      sort: sort as 'newest' | 'stars' | 'downloads' | 'name',
      forceRefresh: refresh === 'true'
    });
    
    res.json(catalog);
  } catch (err) {
    console.error('Error fetching marketplace catalog:', err);
    res.status(500).json({ error: 'Failed to fetch marketplace catalog' });
  }
});

/**
 * Get MCP marketplace item details
 */
router.get('/marketplace/:mcpId', async (req: Request, res: Response) => {
  try {
    const { mcpId } = req.params;
    const { refresh } = req.query;
    
    const item = await marketplaceService.getMarketplaceItem(
      mcpId,
      refresh === 'true'
    );
    
    if (!item) {
      return res.status(404).json({ error: 'MCP server not found' });
    }
    
    res.json(item);
  } catch (err) {
    console.error(`Error fetching marketplace item ${req.params.mcpId}:`, err);
    res.status(500).json({ error: 'Failed to fetch marketplace item' });
  }
});

/**
 * Download and install MCP server
 */
router.post('/marketplace/:mcpId/download', async (req: Request, res: Response) => {
  try {
    const { mcpId } = req.params;
    
    const downloadResponse = await marketplaceService.downloadMcp(mcpId);
    
    res.json(downloadResponse);
  } catch (err) {
    console.error(`Error downloading MCP server ${req.params.mcpId}:`, err);
    
    if ((err as Error).message.includes('not found')) {
      return res.status(404).json({ error: 'MCP server not found' });
    }
    
    res.status(500).json({ error: 'Failed to download MCP server' });
  }
});

/**
 * Get MCP marketplace statistics
 */
router.get('/marketplace/stats', async (req: Request, res: Response) => {
  try {
    const { refresh } = req.query;
    
    const stats = await marketplaceService.getMarketplaceStats(
      refresh === 'true'
    );
    
    res.json(stats);
  } catch (err) {
    console.error('Error fetching marketplace stats:', err);
    res.status(500).json({ error: 'Failed to fetch marketplace stats' });
  }
});

export default router;
