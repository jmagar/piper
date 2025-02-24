You are a strict senior software architect performing a thorough code review. Your analysis should be critical and thorough, focusing on security, performance, and architectural issues.

Categorize each finding by severity:
- CRITICAL: Security vulnerabilities, data loss risks, major performance issues
- ERROR: Bugs, memory leaks, incorrect implementations
- WARNING: Code smells, maintainability issues, unclear patterns
- IMPROVE: Optimization opportunities, architectural enhancements

For each issue found, use this exact format with all fields required:

{number}. [ ] ISSUE {SEVERITY}: {short title}

Title: {clear and concise issue title}

Description: {detailed description of the problem}

Best Practice Violation: {what standards or practices are being violated}

Impact:
{bullet points listing specific impacts}

Steps to Fix:
{numbered list of specific steps to resolve the issue}

Labels: {comma-separated list of labels}

---

Example:
1. [ ] ISSUE CRITICAL: SQL Injection Risk in Query Builder

Title: Unescaped User Input Used Directly in SQL Query

Description: The query builder concatenates user input directly into SQL queries without proper escaping or parameterization, creating a severe security vulnerability.

Best Practice Violation: All user input must be properly escaped or use parameterized queries to prevent SQL injection attacks.

Impact:
- Potential database compromise through SQL injection
- Unauthorized data access
- Possible data loss or corruption
- Security breach vulnerability

Steps to Fix:
1. Replace string concatenation with parameterized queries
2. Add input validation layer
3. Implement proper escaping for special characters
4. Add SQL injection tests

Labels: security, priority-critical, effort-small

---

Analysis criteria (be thorough and strict):
1. Security:
   - SQL injection risks
   - XSS vulnerabilities
   - Unsafe data handling
   - Exposed secrets
   - Insecure dependencies

2. Performance:
   - Inefficient algorithms (O(n²) or worse)
   - Memory leaks
   - Unnecessary computations
   - Resource management issues
   - Unoptimized database queries

3. Architecture:
   - SOLID principles violations
   - Tight coupling
   - Global state usage
   - Unclear boundaries
   - Mixed responsibilities

4. Code Quality:
   - Missing error handling
   - Untestable code
   - Code duplication
   - Complex conditionals
   - Deep nesting

Label types:
- security: Security vulnerabilities and risks
- performance: Performance issues and bottlenecks
- architecture: Design and structural problems
- reliability: Error handling and stability issues
- maintainability: Code organization and clarity
- scalability: Growth and scaling concerns
- testing: Test coverage and testability

Priority levels:
- priority-critical: Fix immediately (security risks, data loss)
- priority-high: Fix in next release (bugs, performance)
- priority-medium: Plan to fix soon (code quality)
- priority-low: Consider fixing (improvements)

Effort estimates:
- effort-small: simple changes, up to 1 day
- effort-medium: moderate changes, 2-3 days
- effort-large: complex changes, more than 3 days

Code to analyze:
---

# Code Collection: index.ts

Source: /home/jmagar/code/pooper/backend/src/index.ts

## Table of Contents

- [src/index.ts](#src-index-ts)

## Files

### src/index.ts {#src-index-ts}
```typescript
import { createServer } from 'http';

import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

import chatRoutes from './routes/chat.routes.js';
import configRoutes from './routes/config.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import healthRoutes from './routes/health.routes.js';
import mcpRoutes from './routes/mcp.routes.js';
import promptRoutes from './routes/prompt.routes.js';
import { initWebSocket } from './websocket.js';

// Initialize environment variables
dotenv.config();

// Initialize Prisma
const prisma = new PrismaClient();

const app = express();

// CORS configuration
const corsOptions = {
    origin: '*',  // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Basic middleware
app.use(cors(corsOptions));
app.use(express.json());

// Handle preflight requests
app.options('*', cors(corsOptions));

// Mount API routes
app.use('/api/health', healthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/config', configRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/prompt', promptRoutes);

// Basic error handling
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ 
        error: {
            message: err.message || 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
    });
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize WebSocket with updated CORS options
const io = initWebSocket(httpServer, prisma);

// Get port from environment or use default
const port = process.env.PORT || 4100;
const serverUrl = `http://localhost:${port}`;
const wsUrl = `ws://localhost:${port}`;

// Start server
httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`WebSocket server running at ws://localhost:${port}`);
    console.log('Environment variables loaded:', {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? '***' : undefined,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '***' : undefined,
        BRAVE_API_KEY: process.env.BRAVE_API_KEY ? '***' : undefined,
        GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PERSONAL_ACCESS_TOKEN ? '***' : undefined,
    });

    // Close Prisma and Socket.IO when app shuts down
    process.on('SIGTERM', async () => {
        console.log('Shutting down server...');
        await prisma.$disconnect();
        await io.close();
        process.exit(0);
    });
});

```

