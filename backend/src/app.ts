import cors from 'cors';
import express from 'express';
import type { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import process from 'node:process';
import console from 'node:console';

import chatRoutes from './routes/chat.routes.js';
import configRoutes from './routes/config.routes.js';
import mcpRoutes from './routes/mcp.routes.js';
import promptRoutes from './routes/prompt.routes.js';
import healthRoutes from './routes/health.routes.js';
import knowledgeRoutes from './routes/knowledge.routes.js';

const app: Application = express();

// Custom JSON replacer function
function jsonReplacer(_key: string, value: unknown) {
  if (value !== null && typeof value === 'object') {
    return value;
  }
  return value;
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Override express response.json()
app.use((_req: Request, res: Response, _next: NextFunction) => {
  const originalJson = res.json;
  res.json = function(body: unknown) {
    return originalJson.call(this, JSON.parse(JSON.stringify(body, jsonReplacer)));
  };
  _next();
});

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/config', configRoutes);
app.use('/api/prompt', promptRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/knowledge', knowledgeRoutes);

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      message: 'An unexpected error occurred',
      details: process.env['NODE_ENV'] === 'development' ? err.message : undefined
    }
  });
});

export default app;
