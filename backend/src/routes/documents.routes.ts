import { Request, Response, Router } from 'express';
import { logger } from '../utils/logger.js';
import { documentsService } from '../services/documents/documents.service.js';

const router = Router();
const log = logger.child({ module: 'DocumentsRoutes' });

/**
 * List documents with filtering and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset as string | undefined;
    const path = req.query.path as string | undefined;
    const tags = req.query.tags as string | undefined;
    
    log.info(`Listing documents with params: ${JSON.stringify({ limit, offset, path, tags })}`);
    
    const result = await documentsService.listDocuments({
      limit,
      offset,
      path,
      tags,
    });
    
    res.json(result);
  } catch (error) {
    log.error('Error listing documents:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

/**
 * Create a new document
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { content, metadata } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    log.info('Creating new document');
    
    const document = await documentsService.createDocument({
      content,
      metadata: metadata || {},
    });
    
    res.status(201).json(document);
  } catch (error) {
    log.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

/**
 * Get a document by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    log.info(`Getting document: ${id}`);
    
    const document = await documentsService.getDocument(id);
    
    res.json(document);
  } catch (error) {
    log.error(`Error getting document ${req.params.id}:`, error);
    
    if (error instanceof Error && error.message === 'Document not found') {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.status(500).json({ error: 'Failed to get document' });
  }
});

/**
 * Update a document
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, metadata } = req.body;
    
    if (!content && !metadata) {
      return res.status(400).json({ error: 'Content or metadata is required' });
    }
    
    log.info(`Updating document: ${id}`);
    
    const document = await documentsService.updateDocument({
      id,
      content,
      metadata,
    });
    
    res.json(document);
  } catch (error) {
    log.error(`Error updating document ${req.params.id}:`, error);
    
    if (error instanceof Error && error.message === 'Document not found') {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.status(500).json({ error: 'Failed to update document' });
  }
});

/**
 * Delete a document
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    log.info(`Deleting document: ${id}`);
    
    await documentsService.deleteDocument(id);
    
    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    log.error(`Error deleting document ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

/**
 * Search documents
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, limit, offset, filter } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    log.info(`Searching documents: ${query}`);
    
    const result = await documentsService.searchDocuments({
      query,
      limit,
      offset,
      filter,
    });
    
    res.json(result);
  } catch (error) {
    log.error('Error searching documents:', error);
    res.status(500).json({ error: 'Failed to search documents' });
  }
});

/**
 * Get file explorer tree
 */
router.get('/tree', async (_req: Request, res: Response) => {
  try {
    log.info('Getting file explorer tree');
    
    const tree = await documentsService.getFileExplorerTree();
    
    res.json({ tree });
  } catch (error) {
    log.error('Error getting file explorer tree:', error);
    res.status(500).json({ error: 'Failed to get file explorer tree' });
  }
});

export default router; 