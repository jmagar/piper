import { Request, Response, Router } from 'express';
import { Logger } from '../utils/logger.js';
import { knowledgeService, KnowledgeSearchParams, KnowledgeDocumentsParams } from '../services/knowledge/knowledge.service.js';

const router = Router();
const logger = new Logger('KnowledgeRoutes');

/**
 * Search the knowledge base with semantic search
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const params: KnowledgeSearchParams = {
      query: req.query.query as string,
      collection: req.query.collection as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      threshold: req.query.threshold ? parseFloat(req.query.threshold as string) : undefined
    };
    
    logger.info(`Searching knowledge base: ${JSON.stringify(params)}`);
    const results = await knowledgeService.search(params);
    res.json(results);
  } catch (error) {
    logger.error('Error searching knowledge base:', error);
    res.status(500).json({ error: 'Failed to search knowledge base' });
  }
});

/**
 * List all collections in the knowledge base
 */
router.get('/collections', async (_req: Request, res: Response) => {
  try {
    logger.info('Listing knowledge collections');
    const collections = await knowledgeService.listCollections();
    res.json(collections);
  } catch (error) {
    logger.error('Error listing collections:', error);
    res.status(500).json({ error: 'Failed to list collections' });
  }
});

/**
 * List documents in the knowledge base with filtering options
 */
router.get('/documents', async (req: Request, res: Response) => {
  try {
    const params: KnowledgeDocumentsParams = {
      collection: req.query.collection as string | undefined,
      tag: req.query.tag as string | undefined,
      bookmarked: req.query.bookmarked === 'true',
      query: req.query.query as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
    };
    
    logger.info(`Listing knowledge documents: ${JSON.stringify(params)}`);
    const documents = await knowledgeService.listDocuments(params);
    res.json(documents);
  } catch (error) {
    logger.error('Error listing documents:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

// Add a new endpoint for knowledge stats
router.get('/stats', async (req, res) => {
  try {
    // This would be implemented to connect to Qdrant in a real app
    // For now, we'll return mock data that matches our schema
    const stats = {
      totalDocuments: 23,
      recentDocuments: 8,
      collections: [
        { name: 'Documentation', count: 12 },
        { name: 'Research', count: 5 },
        { name: 'Projects', count: 4 },
        { name: 'General', count: 2 }
      ],
      totalCollections: 4,
      recentlyAccessed: {
        id: 'doc-123',
        title: 'Project Requirements',
        timestamp: new Date().toISOString()
      },
      mostAccessed: {
        id: 'doc-456',
        title: 'API Documentation',
        accessCount: 24
      },
      topTags: [
        { tag: 'api', count: 8 },
        { tag: 'code', count: 6 },
        { tag: 'documentation', count: 5 },
        { tag: 'research', count: 4 },
        { tag: 'project', count: 3 }
      ]
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting knowledge stats:', error);
    res.status(500).json({ 
      error: 'Failed to get knowledge statistics' 
    });
  }
});

export default router; 