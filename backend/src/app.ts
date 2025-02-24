import cors from 'cors';
import express from 'express';
import type { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

import chatRoutes from './routes/chat.routes.js';
import mcpRoutes from './routes/mcp.routes.js';
import promptRoutes from './routes/prompt.routes.js';

const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/prompt', promptRoutes);
app.use('/api/mcp', mcpRoutes);

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      message: 'An unexpected error occurred',
      details: process.env['NODE_ENV'] === 'development' ? err.message : undefined
    }
  });
});

export default app; 