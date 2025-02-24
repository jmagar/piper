import { PrismaClient } from '@prisma/client';
import { Router } from 'express';

import { McpServerService } from '../services/mcp/server.service.js';
import { McpToolService } from '../services/mcp/tool.service.js';

const router = Router();
const prisma = new PrismaClient();

// Initialize services
const serverService = new McpServerService(prisma);
const toolService = new McpToolService(prisma, serverService);

// Server routes
router.get('/servers', async (_req, res) => {
  try {
    const servers = await prisma.mcpServer.findMany();
    res.json(servers);
  } catch (error) {
    console.error('Failed to fetch servers:', error);
    res.status(500).json({ error: 'Failed to fetch servers' });
  }
});

router.post('/servers', async (req, res) => {
  try {
    const server = await prisma.mcpServer.create({
      data: {
        name: req.body.name,
        url: req.body.url,
        type: String(req.body.type),
        status: req.body.status || 'active',
        metadata: req.body.metadata || null
      }
    });

    // Connect to the server after creation
    await serverService.connectToServer(server.id);

    res.status(201).json(server);
  } catch (error) {
    console.error('Failed to create server:', error);
    res.status(500).json({ error: 'Failed to create server' });
  }
});

// Tool routes
router.get('/tools', async (req, res) => {
  try {
    const tools = await toolService.listTools({
      type: req.query.type as string,
      server: req.query.server as string
    });
    res.json(tools);
  } catch (error) {
    console.error('Failed to fetch tools:', error);
    res.status(500).json({ error: 'Failed to fetch tools' });
  }
});

router.post('/tools', async (req, res) => {
  try {
    const tool = await toolService.registerTool(req.body);
    res.status(201).json(tool);
  } catch (error) {
    console.error('Failed to create tool:', error);
    res.status(500).json({ error: 'Failed to create tool' });
  }
});

router.post('/tools/:name/execute', async (req, res) => {
  try {
    const result = await toolService.executeTool(
      req.params.name,
      req.body.params,
      req.body.serverId
    );
    res.json(result);
  } catch (error) {
    console.error('Failed to execute tool:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to execute tool' });
  }
});

// Health check endpoint
router.get('/health', (_req, res) => {
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    res.json({
      status: 'healthy',
      version: process.env.npm_package_version || '0.1.0',
      uptime,
      memoryUsage: {
        total: memoryUsage.heapTotal,
        used: memoryUsage.heapUsed,
        free: memoryUsage.heapTotal - memoryUsage.heapUsed
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Config routes
router.get('/config', (_req, res) => {
  try {
    const provider = process.env.LLM_PROVIDER || 'openai';
    res.json({
      llm: {
        modelProvider: provider,
        model: process.env.LLM_MODEL || 'gpt-4'
      }
    });
  } catch (error) {
    console.error('Failed to fetch config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

router.post('/config', async (req, res) => {
  try {
    // In a real implementation, we would update environment variables or configuration store
    // For now, we just acknowledge the update
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update config:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

export default router;