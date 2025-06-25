// app/api/mcp/config/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { 
  getAppConfig,
  validateServerConfig,
  invalidateConfigCache
} from '@/lib/mcp/enhanced/cached-config';
import { mcpManager } from '@/lib/mcp/mcpManager';
import { ServerConfigEntry } from '@/lib/mcp/enhanced/types';
import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_DIR = process.env.CONFIG_DIR || '/config';
const CONFIG_FILE_PATH = path.join(CONFIG_DIR, 'config.json');

// Helper function to read the raw config file
async function readRawConfigFile(): Promise<{ mcpServers: Record<string, ServerConfigEntry> }> {
  try {
    const rawConfig = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
    return JSON.parse(rawConfig);
  } catch (error) {
    console.error('Error reading config file for API:', error);
    // If the file doesn't exist or is invalid, start with a base structure
    return { mcpServers: {} }; 
  }
}

// Helper function to write the config file
async function writeConfigFile(config: { mcpServers: Record<string, ServerConfigEntry> }): Promise<void> {
  try {
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
    // Invalidate cache after writing
    await invalidateConfigCache();
  } catch (error) {
    console.error('Error writing config file for API:', error);
    throw new Error('Failed to write configuration file.');
  }
}

export async function GET() {
  // TODO: Implement GET to list all server configurations
  try {
    const appConfig = await getAppConfig();
    return NextResponse.json(appConfig.mcpServers || {});
  } catch (error) {
    console.error('Error in GET /api/mcp/config:', error);
    return NextResponse.json({ error: 'Failed to get MCP configurations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // TODO: Implement POST to add a new server configuration
  try {
    const newServerConfig: { serverKey: string, config: ServerConfigEntry } = await request.json();
    const { serverKey, config } = newServerConfig;

    if (!serverKey || !config) {
      return NextResponse.json({ error: 'Missing serverKey or config in request body' }, { status: 400 });
    }

    const validation = validateServerConfig(config);
    if (!validation.valid) {
      return NextResponse.json({ error: 'Invalid server configuration', details: validation.errors }, { status: 400 });
    }

    const currentFullConfig = await readRawConfigFile();
    if (currentFullConfig.mcpServers[serverKey]) {
      return NextResponse.json({ error: `Server with key '${serverKey}' already exists.` }, { status: 409 }); // Conflict
    }

    currentFullConfig.mcpServers[serverKey] = config;
    await writeConfigFile(currentFullConfig);
    await mcpManager.handleConfigUpdate(); // Notify MCPManager of the change
    return NextResponse.json({ message: `Server ${serverKey} added successfully`, config }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/mcp/config:', error);
    return NextResponse.json({ error: 'Failed to add MCP configuration', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // TODO: Implement PUT to update an existing server configuration
  // Expected URL: /api/mcp/config?serverKey=yourServerKey
  try {
    const serverKey = request.nextUrl.searchParams.get('serverKey');
    const updatedConfig: ServerConfigEntry = await request.json();

    if (!serverKey) {
      return NextResponse.json({ error: 'Missing serverKey query parameter' }, { status: 400 });
    }
    if (!updatedConfig) {
      return NextResponse.json({ error: 'Missing configuration in request body' }, { status: 400 });
    }

    const validation = validateServerConfig(updatedConfig);
    if (!validation.valid) {
      return NextResponse.json({ error: 'Invalid server configuration', details: validation.errors }, { status: 400 });
    }

    const currentFullConfig = await readRawConfigFile();
    if (!currentFullConfig.mcpServers[serverKey]) {
      return NextResponse.json({ error: `Server with key '${serverKey}' not found.` }, { status: 404 });
    }

    currentFullConfig.mcpServers[serverKey] = updatedConfig;
    await writeConfigFile(currentFullConfig);
    await mcpManager.handleConfigUpdate(); // Notify MCPManager of the change
    return NextResponse.json({ message: `Server ${serverKey} updated successfully`, config: updatedConfig });

  } catch (error) {
    console.error('Error in PUT /api/mcp/config:', error);
    return NextResponse.json({ error: 'Failed to update MCP configuration', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // TODO: Implement DELETE to remove a server configuration
  // Expected URL: /api/mcp/config?serverKey=yourServerKey
  try {
    const serverKey = request.nextUrl.searchParams.get('serverKey');

    if (!serverKey) {
      return NextResponse.json({ error: 'Missing serverKey query parameter' }, { status: 400 });
    }

    const currentFullConfig = await readRawConfigFile();
    if (!currentFullConfig.mcpServers[serverKey]) {
      return NextResponse.json({ error: `Server with key '${serverKey}' not found.` }, { status: 404 });
    }

    delete currentFullConfig.mcpServers[serverKey];
    await writeConfigFile(currentFullConfig);
    await mcpManager.handleConfigUpdate(); // Notify MCPManager of the change
    return NextResponse.json({ message: `Server ${serverKey} deleted successfully` });

  } catch (error) {
    console.error('Error in DELETE /api/mcp/config:', error);
    return NextResponse.json({ error: 'Failed to delete MCP configuration', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
