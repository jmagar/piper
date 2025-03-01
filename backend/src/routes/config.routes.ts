import { Router } from 'express';
import debug from 'debug';

const log = debug('api:config');
const error = debug('api:config:error');

const router: Router = Router();

// GET /api/config - Get server configuration
router.get('/', async (_req, res) => {
  try {
    // Return server configuration
    res.json({
      version: process.env.npm_package_version || '0.1.0',
      features: {
        streaming: true,
        fileUpload: true,
        codeExecution: true,
        mcp: true
      },
      limits: {
        maxMessageLength: 32000,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxFilesPerMessage: 5
      },
      providers: {
        openai: true,
        anthropic: true,
        groq: false
      }
    });
  } catch (err) {
    error('Error getting config: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ 
      error: 'Failed to get configuration',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// PUT /api/config - Update server configuration
router.put('/', async (req, res) => {
  try {
    // In a real implementation, we would update environment variables or configuration store
    // For now, we just acknowledge the update
    log('Received config update request: %j', req.body);
    res.json({ success: true });
  } catch (err) {
    error('Error updating config: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ 
      error: 'Failed to update configuration',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

export default router;
