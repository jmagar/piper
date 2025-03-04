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

export default router; 