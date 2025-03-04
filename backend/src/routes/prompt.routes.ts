import express from 'express';
import { PromptTemplateService } from '../services/prompt/prompt-template.service.js';

const router = express.Router();

/**
 * GET /api/prompts
 * Get list of prompt templates with filtering options
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      userId,
      category,
      tags,
      isPublic,
      isFavorited,
      search,
      sort,
      order,
      limit,
      offset,
    } = req.query;

    // Process query parameters
    const options = {
      userId: userId as string,
      category: category as string,
      tags: tags ? (Array.isArray(tags) ? tags as string[] : [tags as string]) : undefined,
      isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
      isFavorited: isFavorited === 'true' ? true : isFavorited === 'false' ? false : undefined,
      search: search as string,
      sort: sort as any,
      order: order as any,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    };

    const result = await PromptTemplateService.getPromptTemplates(options);

    res.json({
      prompts: result.promptTemplates,
      count: result.count,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prompts
 * Create a new prompt template
 */
router.post('/', async (req, res, next) => {
  try {
    const { title, description, content, category, tags, isPublic } = req.body;
    
    // TODO: Get userId from auth middleware
    const userId = req.headers['x-user-id'] as string;

    const promptTemplate = await PromptTemplateService.createPromptTemplate({
      title,
      description,
      content,
      category,
      tags,
      isPublic,
      userId,
    });

    res.status(201).json(promptTemplate);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prompts/:id
 * Get a specific prompt template by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const promptTemplate = await PromptTemplateService.getPromptTemplate(id);
    res.json(promptTemplate);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/prompts/:id
 * Update a prompt template
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, content, category, tags, isPublic, isFavorited } = req.body;

    const promptTemplate = await PromptTemplateService.updatePromptTemplate(id, {
      title,
      description,
      content,
      category,
      tags,
      isPublic,
      isFavorited,
    });

    res.json(promptTemplate);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/prompts/:id
 * Delete a prompt template
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await PromptTemplateService.deletePromptTemplate(id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prompts/:id/favorite
 * Toggle favorite status of a prompt template
 */
router.post('/:id/favorite', async (req, res, next) => {
  try {
    const { id } = req.params;
    const promptTemplate = await PromptTemplateService.toggleFavorite(id);
    res.json(promptTemplate);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prompts/:id/use
 * Record usage of a prompt template
 */
router.post('/:id/use', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { conversationId } = req.body;
    
    // TODO: Get userId from auth middleware
    const userId = req.headers['x-user-id'] as string;

    const usageHistory = await PromptTemplateService.recordPromptUsage({
      promptId: id,
      conversationId,
      userId,
    });

    res.json(usageHistory);
  } catch (error) {
    next(error);
  }
});

export default router; 