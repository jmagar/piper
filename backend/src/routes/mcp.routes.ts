import { PrismaClient } from '@prisma/client';
import debug from 'debug';
import { Request, Response, Router } from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import JSON5 from 'json5';
import { v4 as uuidv4 } from 'uuid';

import { McpServerService } from '../services/mcp/server.service.js';
import { McpToolService } from '../services/mcp/tool.service.js';
import { loadConfig, validateConfig } from '../load-config.js';

// Use explicit type annotation
const router: Router = Router();
const prisma = new PrismaClient();
const log = debug('api:mcp');
const error = debug('api:mcp:error');

// LLM Config constants - use absolute paths
const CONFIG_PATH = process.env.LLM_CONFIG_PATH || join(process.cwd().endsWith('/backend') 
  ? join(process.cwd(), '..') 
  : process.cwd(), 
  'llm_mcp_config.json5');

const BACKUP_DIR = process.env.CONFIG_BACKUP_DIR || join(process.cwd().endsWith('/backend') 
  ? join(process.cwd(), '..') 
  : process.cwd(), 
  'config-backups');

// Log actual resolved paths
log('Config path: %s', CONFIG_PATH);
log('Backup directory path: %s', BACKUP_DIR);

// Ensure backup directory exists
try {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
    log('Created backup directory: %s', BACKUP_DIR);
  }
} catch (err) {
  error('Failed to create backup directory: %s', err instanceof Error ? err.message : String(err));
}

// Initialize services
const serverService = new McpServerService(prisma);
const toolService = new McpToolService(prisma, serverService);

// Health endpoint
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Simple health check
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    res.json({
      status: 'healthy',
      uptime,
      memoryUsage: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed
      }
    });
  } catch (err) {
    error('Health check error: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Health check failed' });
  }
});

/**
 * Helper function to determine transport type from URL
 */
function determineTransportFromUrl(url: string): string {
  if (url.includes('ssse')) return 'ssse';
  if (url.includes('stdio')) return 'stdio';
  if (url.includes('ws')) return 'websocket';
  if (url.includes('http')) return 'http';
  return 'unknown';
}

/**
 * Server Routes
 */

// GET /api/mcp/servers - List all servers
router.get('/servers', async (_req: Request, res: Response): Promise<void> => {
  try {
    const servers = await prisma.mcpServer.findMany({
      include: {
        tools: true
      }
    });
    
    // Add computed fields and ensure proper structure for each server
    const enhancedServers = servers.map(server => {
      // Create a mutable server object
      const serverObj = { ...server };
      
      // Set transport if not already set
      if (!serverObj.transport) {
        // @ts-ignore - We're adding the transport property dynamically
        serverObj.transport = determineTransportFromUrl(serverObj.url);
      }
      
      // Ensure metadata is an object
      let metadata = serverObj.metadata as Record<string, any> | null;
      metadata = metadata || {};
      
      // Add tools information to metadata
      if (!metadata.tools) {
        metadata.tools = {
          count: server.tools.length,
          names: server.tools.map(tool => tool.name)
        };
      }
      
      return {
        ...serverObj,
        metadata
      };
    });
    
    res.json({ servers: enhancedServers });
  } catch (err) {
    error('Failed to list servers: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to list servers' });
  }
});

// GET /api/mcp/servers/:serverId - Get server details
router.get('/servers/:serverId', async (req: Request<{ serverId: string }>, res: Response): Promise<void> => {
  try {
    const { serverId } = req.params;
    const server = await prisma.mcpServer.findUnique({
      where: { id: serverId },
      include: {
        tools: true
      }
    });

    if (!server) {
      res.status(404).json({ error: 'Server not found' });
      return;
    }
    
    // Create a mutable server object
    const serverObj = { ...server };
    
    // Set transport if not already set
    if (!serverObj.transport) {
      // @ts-ignore - We're adding the transport property dynamically
      serverObj.transport = determineTransportFromUrl(serverObj.url);
    }
    
    // Ensure metadata is an object
    let metadata = serverObj.metadata as Record<string, any> | null;
    metadata = metadata || {};
    
    // Add tools information to metadata
    if (!metadata.tools) {
      metadata.tools = {
        count: server.tools.length,
        names: server.tools.map(tool => tool.name)
      };
    }

    // If health status is not set, perform a health check
    if (!metadata.health || !metadata.health.lastChecked) {
      try {
        const healthCheckStart = Date.now();
        const response = await fetch(`${serverObj.url}/health`, { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        const responseTime = Date.now() - healthCheckStart;
        
        metadata.health = {
          status: response.ok ? 'healthy' : 'unhealthy',
          lastChecked: new Date().toISOString(),
          responseTime
        };
      } catch (healthErr) {
        log('Health check failed for server %s: %s', 
          serverObj.name, healthErr instanceof Error ? healthErr.message : String(healthErr));
        
        metadata.health = {
          status: 'unhealthy',
          lastChecked: new Date().toISOString(),
          responseTime: 0
        };
      }
    }
    
    res.json({
      ...serverObj,
      metadata
    });
  } catch (err) {
    error('Failed to get server: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to get server details' });
  }
});

// POST /api/mcp/servers - Register a new server
router.post('/servers', async (req: Request, res: Response): Promise<void> => {
  try {
    const serverData = req.body;
    
    if (!serverData || !serverData.name || !serverData.url) {
      res.status(400).json({ error: 'Missing required server data' });
      return;
    }
    
    // Create the server with Prisma instead of using the service
    const newServer = await prisma.mcpServer.create({
      data: {
        name: serverData.name,
        url: serverData.url,
        type: serverData.type || 'openai',
        status: serverData.status || 'active',
        metadata: serverData.metadata || {}
      }
    });
    
    // Connect to the server after creation if possible
    try {
      await serverService.connectToServer(newServer.id);
    } catch (connectionErr) {
      log('Warning: Could not connect to new server: %s', connectionErr instanceof Error ? connectionErr.message : String(connectionErr));
      // Continue with server creation even if connection fails
    }
    
    res.status(201).json(newServer);
  } catch (err) {
    error('Failed to register server: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to register server' });
  }
});

// DELETE /api/mcp/servers/:serverId - Unregister a server
router.delete('/servers/:serverId', async (req: Request<{ serverId: string }>, res: Response): Promise<void> => {
  try {
    const { serverId } = req.params;
    
    // First try to connect to server to close connection
    try {
      await serverService.connectToServer(serverId);
    } catch (connectionErr) {
      log('Warning: Could not connect to server before deletion: %s', connectionErr instanceof Error ? connectionErr.message : String(connectionErr));
      // Continue with deletion even if connection fails
    }
    
    // Delete the server from database
    await prisma.mcpServer.delete({
      where: { id: serverId }
    });
    
    res.status(204).send();
  } catch (err) {
    error('Failed to unregister server: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to unregister server' });
  }
});

/**
 * Tool Routes
 */

// GET /api/mcp/tools - List all tools
router.get('/tools', async (_req: Request, res: Response): Promise<void> => {
  try {
    const tools = await prisma.mcpTool.findMany({
      include: { server: true }
    });
    
    const formattedTools = tools.map(tool => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      type: tool.type,
      parameters: tool.parameters,
      serverId: tool.serverId,
      serverName: tool.server?.name
    }));
    
    res.json({ tools: formattedTools });
  } catch (err) {
    error('Failed to list tools: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to list tools' });
  }
});

// GET /api/mcp/tools/:toolId - Get tool details
router.get('/tools/:toolId', async (req: Request<{ toolId: string }>, res: Response): Promise<void> => {
  try {
    const { toolId } = req.params;
    const tool = await prisma.mcpTool.findUnique({
      where: { id: toolId },
      include: { server: true }
    });
    
    if (!tool) {
      res.status(404).json({ error: 'Tool not found' });
      return;
    }
    
    res.json({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      type: tool.type,
      parameters: tool.parameters,
      serverId: tool.serverId,
      serverName: tool.server?.name
    });
  } catch (err) {
    error('Failed to get tool: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to get tool details' });
  }
});

// POST /api/mcp/tools - Register a new tool
router.post('/tools', async (req: Request, res: Response): Promise<void> => {
  try {
    const toolData = req.body;
    
    if (!toolData || !toolData.name || !toolData.description) {
      res.status(400).json({ error: 'Missing required tool data' });
      return;
    }
    
    const newTool = await toolService.registerTool(toolData);
    res.status(201).json(newTool);
  } catch (err) {
    error('Failed to register tool: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to register tool' });
  }
});

// PUT /api/mcp/tools/:toolId - Update a tool
router.put('/tools/:toolId', async (req: Request<{ toolId: string }>, res: Response): Promise<void> => {
  try {
    const { toolId } = req.params;
    const toolData = req.body;
    
    if (!toolData) {
      res.status(400).json({ error: 'Missing tool data' });
      return;
    }
    
    // Check if tool exists
    const existingTool = await prisma.mcpTool.findUnique({
      where: { id: toolId }
    });
    
    if (!existingTool) {
      res.status(404).json({ error: 'Tool not found' });
      return;
    }
    
    // Update the tool
    const updatedTool = await prisma.mcpTool.update({
      where: { id: toolId },
      data: {
        name: toolData.name ?? existingTool.name,
        description: toolData.description ?? existingTool.description,
        type: toolData.type ?? existingTool.type,
        parameters: toolData.parameters ?? existingTool.parameters,
        metadata: toolData.metadata ?? existingTool.metadata
      },
      include: { server: true }
    });
    
    res.json({
      id: updatedTool.id,
      name: updatedTool.name,
      description: updatedTool.description,
      type: updatedTool.type,
      parameters: updatedTool.parameters,
      serverId: updatedTool.serverId,
      serverName: updatedTool.server?.name
    });
  } catch (err) {
    error('Failed to update tool: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to update tool' });
  }
});

// DELETE /api/mcp/tools/:toolId - Delete a tool
router.delete('/tools/:toolId', async (req: Request<{ toolId: string }>, res: Response): Promise<void> => {
  try {
    const { toolId } = req.params;
    
    // Check if tool exists
    const existingTool = await prisma.mcpTool.findUnique({
      where: { id: toolId }
    });
    
    if (!existingTool) {
      res.status(404).json({ error: 'Tool not found' });
      return;
    }
    
    // Delete the tool
    await prisma.mcpTool.delete({
      where: { id: toolId }
    });
    
    res.status(204).send();
  } catch (err) {
    error('Failed to delete tool: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to delete tool' });
  }
});

// POST /api/mcp/tools/:name/execute - Execute a tool
router.post('/tools/:name/execute', async (req: Request<{ name: string }>, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    const { parameters } = req.body;
    
    if (!parameters) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }
    
    const result = await toolService.executeTool(name, parameters);
    res.json(result);
  } catch (err) {
    error('Failed to execute tool: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to execute tool' });
  }
});

/**
 * Configuration Management Routes
 */

// GET /api/mcp/config - Get current config
router.get('/config', async (_req: Request, res: Response): Promise<void> => {
  try {
    const config = loadConfig(CONFIG_PATH);
    res.json(config);
  } catch (err) {
    error('Failed to load config: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to load configuration' });
  }
});

// PUT /api/mcp/config - Update config
router.put('/config', async (req: Request, res: Response): Promise<void> => {
  try {
    const newConfig = req.body;
    const createBackup = req.query.backup === 'true';
    
    // Validate config - validateConfig throws an error if invalid
    try {
      validateConfig(newConfig);
    } catch (validationErr) {
      res.status(400).json({ 
        error: 'Invalid configuration', 
        details: validationErr instanceof Error ? validationErr.message : String(validationErr) 
      });
      return;
    }
    
    // Create backup if requested
    if (createBackup) {
      const timestamp = new Date().toISOString();
      const backupId = `backup_${timestamp.replace(/[-:.]/g, '')}_${uuidv4().substring(0, 8)}`;
      const backupPath = join(BACKUP_DIR, `${backupId}.json5`);
      
      try {
        // Read current config
        const currentConfig = readFileSync(CONFIG_PATH, 'utf-8');
        // Write to backup
        writeFileSync(backupPath, currentConfig);
        log('Created backup: %s', backupPath);
      } catch (backupErr) {
        log('Failed to create backup: %s', backupErr instanceof Error ? backupErr.message : String(backupErr));
        // Continue even if backup fails
      }
    }
    
    // Write new config
    writeFileSync(CONFIG_PATH, JSON5.stringify(newConfig, null, 2));
    
    res.json({ success: true, message: 'Configuration updated successfully' });
  } catch (err) {
    error('Failed to update config: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

/**
 * Configuration Backup Routes
 */

// GET /api/mcp/config/backup - List backups
router.get('/config/backup', async (_req: Request, res: Response): Promise<void> => {
  try {
    const backups = readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.json5'))
      .map(file => {
        const filePath = join(BACKUP_DIR, file);
        const stats = statSync(filePath);
        const id = file.replace('.json5', '');
        
        return {
          id,
          timestamp: stats.mtime.toISOString(),
          path: filePath
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    res.json({ backups });
  } catch (err) {
    error('Failed to list backups: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to list configuration backups' });
  }
});

// POST /api/mcp/config/backup - Create backup
router.post('/config/backup', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Create a new backup
    const timestamp = new Date().toISOString();
    const backupId = `backup_${timestamp.replace(/[-:.]/g, '')}_${uuidv4().substring(0, 8)}`;
    const backupPath = join(BACKUP_DIR, `${backupId}.json5`);
    
    // Read current config
    const currentConfig = readFileSync(CONFIG_PATH, 'utf-8');
    
    // Write to backup file
    writeFileSync(backupPath, currentConfig);
    
    const stats = statSync(backupPath);
    
    res.status(201).json({
      id: backupId,
      timestamp: stats.mtime.toISOString(),
      path: backupPath
    });
  } catch (err) {
    error('Failed to create backup: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to create configuration backup' });
  }
});

// GET /api/mcp/config/backup/:backupId - Get backup
router.get('/config/backup/:backupId', async (req: Request<{ backupId: string }>, res: Response): Promise<void> => {
  try {
    const { backupId } = req.params;
    const backupPath = join(BACKUP_DIR, `${backupId}.json5`);
    
    if (!existsSync(backupPath)) {
      res.status(404).json({ error: 'Backup not found' });
      return;
    }
    
    const backupContent = readFileSync(backupPath, 'utf-8');
    const config = JSON5.parse(backupContent);
    
    res.json(config);
  } catch (err) {
    error('Failed to get backup: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to retrieve configuration backup' });
  }
});

// POST /api/mcp/config/backup/:backupId - Restore backup
router.post('/config/backup/:backupId', async (req: Request<{ backupId: string }>, res: Response): Promise<void> => {
  try {
    const { backupId } = req.params;
    const backupPath = join(BACKUP_DIR, `${backupId}.json5`);
    
    if (!existsSync(backupPath)) {
      res.status(404).json({ error: 'Backup not found' });
      return;
    }
    
    // Read backup content
    const backupContent = readFileSync(backupPath, 'utf-8');
    
    // Validate the backup content before restoring
    try {
      const config = JSON5.parse(backupContent);
      
      // validateConfig throws if invalid
      validateConfig(config);
      
      // Write backup to config file
      writeFileSync(CONFIG_PATH, backupContent);
      
      res.json({ 
        success: true, 
        message: 'Configuration restored from backup' 
      });
    } catch (parseErr) {
      error('Failed to parse/validate backup: %s', parseErr instanceof Error ? parseErr.message : String(parseErr));
      res.status(400).json({ 
        error: 'Invalid backup file format',
        details: parseErr instanceof Error ? parseErr.message : String(parseErr)
      });
    }
  } catch (err) {
    error('Failed to restore backup: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to restore configuration from backup' });
  }
});

// DELETE /api/mcp/config/backup/:backupId - Delete backup
router.delete('/config/backup/:backupId', async (req: Request<{ backupId: string }>, res: Response): Promise<void> => {
  try {
    const { backupId } = req.params;
    const backupPath = join(BACKUP_DIR, `${backupId}.json5`);
    
    if (!existsSync(backupPath)) {
      res.status(404).json({ error: 'Backup not found' });
      return;
    }
    
    // Delete backup file
    const fs = await import('fs/promises');
    await fs.unlink(backupPath);
    
    res.status(204).send();
  } catch (err) {
    error('Failed to delete backup: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to delete configuration backup' });
  }
});

// POST /api/mcp/config/validate - Validate config without saving
router.post('/config/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const configToValidate = req.body;
    
    if (!configToValidate) {
      res.status(400).json({ error: 'Missing configuration data' });
      return;
    }
    
    try {
      // validateConfig throws if invalid
      validateConfig(configToValidate);
      res.json({ valid: true });
    } catch (validationErr) {
      res.status(400).json({ 
        valid: false, 
        errors: validationErr instanceof Error ? validationErr.message : String(validationErr)
      });
    }
  } catch (err) {
    error('Validation error: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to validate configuration' });
  }
});

/**
 * Logs Routes
 */

// GET /api/mcp/logs - Get MCP logs
router.get('/logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      level = null,
      server = null,
      limit = 100,
      skip = 0,
      since = null
    } = req.query;
    
    // Convert parameters to the correct types
    const limitNum = Number(limit);
    const skipNum = Number(skip);
    
    // Build query for the logs from the database
    const query: any = {};
    
    // Add filter conditions
    if (level) {
      query.level = level;
    }
    
    if (server) {
      query.server = server;
    }
    
    if (since) {
      query.timestamp = {
        gte: new Date(since as string)
      };
    }
    
    // Query logs from the database
    const logs = await prisma.logEntry.findMany({
      where: query,
      orderBy: {
        timestamp: 'desc'
      },
      take: limitNum,
      skip: skipNum
    });
    
    // Get total count for pagination
    const total = await prisma.logEntry.count({
      where: query
    });
    
    res.json({
      logs,
      total
    });
  } catch (err) {
    error('Failed to retrieve logs: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

// GET /api/mcp/logs/stream - WebSocket endpoint (handled by socket-logger.ts)
router.get('/logs/stream', (req: Request, res: Response): void => {
  // This is just a placeholder endpoint to document in the API
  // The actual WebSocket connection is handled by the socket-logger utility
  res.json({
    status: 'connected',
    message: 'Please connect via WebSocket to receive log events'
  });
});

/**
 * Config Schema Routes
 */

// GET /api/mcp/config/schema - Get MCP config schema
router.get('/config/schema', (_req: Request, res: Response): void => {
  try {
    // Define the schema for MCP configuration
    // This represents the structure of the llm_mcp_config.json5 file
    const schema = {
      type: "object",
      required: ["llm", "mcp_servers"],
      properties: {
        llm: {
          type: "object",
          required: ["model_provider", "model"],
          properties: {
            model_provider: {
              type: "string",
              enum: ["openai", "anthropic", "google", "ollama", "mistral", "custom"],
              description: "The provider of the language model"
            },
            model: {
              type: "string",
              description: "The model identifier" 
            },
            temperature: {
              type: "number",
              minimum: 0,
              maximum: 2,
              description: "Controls randomness in output generation"
            },
            max_tokens: {
              type: "integer",
              minimum: 1,
              description: "Maximum number of tokens to generate"
            }
          }
        },
        example_queries: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Example queries to show in the UI"
        },
        mcp_servers: {
          type: "object",
          additionalProperties: {
            type: "object",
            required: ["command", "args"],
            properties: {
              command: {
                type: "string",
                description: "The command to execute"
              },
              args: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "Arguments to pass to the command"
              },
              env: {
                type: "object",
                additionalProperties: {
                  type: "string"
                },
                description: "Environment variables for the process"
              }
            }
          },
          description: "Configuration for MCP servers"
        }
      }
    };
    
    res.json(schema);
  } catch (err) {
    error('Failed to retrieve config schema: %s', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Failed to retrieve config schema' });
  }
});

export default router;
