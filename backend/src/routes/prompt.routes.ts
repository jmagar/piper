import { Router } from 'express';
import { z } from 'zod';

import { PromptService } from '../services/prompt/prompt.service.js';

const router = Router();
const promptService = new PromptService();

// Schema for prompt enhancement request
const enhancePromptSchema = z.object({
  prompt: z.string().min(1),
  options: z.object({
    temperature: z.number().min(0).max(1).optional(),
    maxTokens: z.number().int().min(1).optional()
  }).optional()
});

router.post('/enhance', async (req, res) => {
  try {
    // Validate request body
    const { prompt, options } = enhancePromptSchema.parse(req.body);

    // Enhance the prompt
    const result = await promptService.enhancePrompt(prompt, options);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          message: 'Invalid request body',
          details: error.errors
        }
      });
      return;
    }

    console.error('Error enhancing prompt:', error);
    res.status(500).json({
      error: {
        message: 'Failed to enhance prompt',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

export default router; 