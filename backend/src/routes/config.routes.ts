import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  try {
    // Return model configuration
    res.json({
      models: [
        {
          id: 'claude-3-5-sonnet-20241022',
          name: 'Claude 3.5 Sonnet',
          provider: 'anthropic',
          description: 'A powerful language model for chat and text generation',
          maxTokens: 1000,
          temperature: 0.7,
          isDefault: true
        }
      ]
    });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ 
      error: 'Failed to get configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;