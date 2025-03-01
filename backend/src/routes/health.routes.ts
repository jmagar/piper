import { Router } from 'express';
import debug from 'debug';
import type { Request, Response } from 'express';

const log = debug('mcp:health:routes');
const webSocketLog = debug('mcp:websocket:health');

const router = Router();

/**
 * Health check endpoint
 * @route GET /api/health
 * @returns {object} 200 - Success response with service status
 */
router.get('/', (_req: Request, res: Response) => {
  log('Health check requested');
  
  const services = {
    api: 'healthy',
    database: process.env.DATABASE_URL ? 'configured' : 'unconfigured',
    websocket: 'running on port ' + (process.env.PORT || 4100),
    models: {
      anthropic: process.env.ANTHROPIC_API_KEY ? 'configured' : 'unconfigured',
      openai: process.env.OPENAI_API_KEY ? 'configured' : 'unconfigured',
    }
  };
  
  res.json({
    status: 'ok',
    message: 'Service is healthy',
    timestamp: new Date().toISOString(),
    services,
    env: process.env.NODE_ENV || 'development'
  });
});

/**
 * WebSocket test endpoint to check websocket server status
 * @route GET /api/health/websocket
 * @returns {object} 200 - Success response with WebSocket server status
 */
router.get('/websocket', (_req: Request, res: Response) => {
  webSocketLog('WebSocket health check requested');
  
  const wsServerStatus = {
    isRunning: true,
    port: process.env.PORT || 4100,
    url: `ws://localhost:${process.env.PORT || 4100}`,
    timestamp: new Date().toISOString(),
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    pingInterval: 25000,
    pingTimeout: 20000
  };
  
  webSocketLog('WebSocket status: %o', wsServerStatus);
  
  res.json({
    status: 'ok',
    message: 'WebSocket server status',
    ...wsServerStatus,
    testInstructions: {
      browser: 'Open your browser console and run: const ws = new WebSocket("ws://localhost:4100"); ws.onopen = () => console.log("Connected"); ws.onclose = () => console.log("Disconnected");',
      curl: 'Run: curl --include --no-buffer --header "Connection: Upgrade" --header "Upgrade: websocket" --header "Sec-WebSocket-Version: 13" http://localhost:4100/'
    }
  });
});

export default router;