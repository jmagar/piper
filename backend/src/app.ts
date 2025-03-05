import cors from 'cors';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import debug from 'debug';
import helmet from 'helmet';
import process from 'node:process';
import console from 'node:console';

import chatRoutes from './routes/chat.routes.js';
import configRoutes from './routes/config.routes.js';
import mcpRoutes from './routes/mcp.routes.js';
import promptRoutes from './routes/prompt.routes.js';
import healthRoutes from './routes/health.routes.js';
import knowledgeRoutes from './routes/knowledge.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import documentsRoutes from './routes/documents.routes.js';

const log = debug('pooper:app');
const error = debug('pooper:app:error');

const app: express.Application = express();

// Custom JSON replacer function
function jsonReplacer(_key: string, value: unknown) {
  if (value !== null && typeof value === 'object') {
    return value;
  }
  return value;
}

// CORS middleware for development - most permissive settings possible
const corsOptions = {
  origin: true, // Allow all origins for development (using true instead of * for better compatibility)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [ 
    "Content-Type", 
    "Authorization", 
    "X-Requested-With", 
    "Accept", 
    "Origin",
    "Access-Control-Request-Method", 
    "Access-Control-Request-Headers",
    "x-client-hostname",
    "x-client-version"
  ], // Not including 'Access-Control-Allow-Origin' as it's a response header, not a request header
  exposedHeaders: ['Content-Length', 'Date', 'Access-Control-Allow-Origin'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours in seconds
};

// Global CORS preflight handler for all OPTIONS requests
app.options('*', (req: Request, res: Response) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', corsOptions.methods.join(', '));
  res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));
  res.header('Access-Control-Max-Age', '86400');
  res.status(204).end();
});

// Global CORS headers for all requests
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));
  res.header('Access-Control-Allow-Methods', corsOptions.methods.join(', '));
  next();
});

// Middleware
app.use(helmet({ 
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin resource sharing
}));
// Apply CORS middleware before other middleware
app.use(cors(corsOptions)); 

// Additional headers for Socket.IO CORS
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('/socket.io')) {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));
      res.header('Access-Control-Max-Age', '86400');
      res.status(204).end();
      return;
    }
  }
  next();
});
app.use(express.json());

// Override express response.json()
app.use((_req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  res.json = function(body: unknown) {
    return originalJson.call(this, JSON.parse(JSON.stringify(body, jsonReplacer)));
  };
  next();
});

// Log requests in development
if (process.env.NODE_ENV === 'development') {
  app.use((_req: Request, _res: Response, _next: NextFunction) => {
    log(`${_req.method} ${_req.path}`);
    _next();
  });
}

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/config', configRoutes);
app.use('/api/prompt', promptRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/documents', documentsRoutes);

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  error(err.stack);
  console.error(err.stack);
  res.status(500).json({
    error: {
      message: 'An unexpected error occurred',
      details: process.env['NODE_ENV'] === 'development' ? err.message : undefined
    }
  });
});

export default app;
