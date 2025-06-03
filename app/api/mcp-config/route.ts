import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Define TypeScript Interfaces
interface MCPTransportSSE {
  type: 'sse' | 'http';
  url: string;
  headers?: Record<string, string>;
}

interface MCPTransportStdio {
  type: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

type MCPTransport = MCPTransportSSE | MCPTransportStdio;

export interface MCPServerConfigFromUI {
  id: string; 
  name: string; 
  displayName?: string;
  transport: MCPTransport;
  enabled: boolean;
}

// This is the structure within config.json for a single server entry
// It doesn't have id, name (as it's the key), or displayName
interface StoredMCPServerEntry {
  command?: string; // For stdio
  args?: string[]; // For stdio
  env?: Record<string, string>; // For stdio
  cwd?: string; // For stdio
  url?: string; // For sse/http
  headers?: Record<string, string>; // For sse/http
  transportType?: 'sse' | 'http' | 'stdio'; // Explicit transport type
  disabled?: boolean; // To allow disabling from config
  displayName?: string; // User-friendly name, can be stored
  // Allow any other properties that might exist
  [key: string]: unknown;
}

interface PiperConfig {
  mcpServers: Record<string, StoredMCPServerEntry>;
  // other config properties
}

const configFilePath = path.join(process.env.CONFIG_DIR || '/config', 'config.json');

export async function GET() {
  try {
    const fileContents = await fs.readFile(configFilePath, 'utf-8');
    const config = JSON.parse(fileContents) as PiperConfig;

    if (!config.mcpServers) {
      return NextResponse.json({ mcpServers: [] });
    }

    const serversForUI: MCPServerConfigFromUI[] = Object.entries(config.mcpServers).map(([name, details]) => {
      let transport: MCPTransport;
      // Infer transportType if not explicitly set, for backward compatibility or simpler configs
      const effectiveTransportType = details.transportType || (details.command ? 'stdio' : (details.url ? (details.type || 'sse') : undefined));

      if (effectiveTransportType === 'stdio' && details.command) {
        transport = {
          type: 'stdio',
          command: details.command,
          args: details.args,
          env: details.env,
          cwd: details.cwd,
        };
      } else if ((effectiveTransportType === 'sse' || effectiveTransportType === 'http') && details.url) {
        transport = {
          type: effectiveTransportType as 'sse' | 'http',
          url: details.url,
          headers: details.headers,
        };
      } else {
        console.warn(`MCP Server '${name}' has an unrecognized or incomplete transport configuration. Details: ${JSON.stringify(details)}`);
        // Create a placeholder transport to avoid crashing the UI, clearly indicating it's misconfigured.
        transport = { type: 'stdio', command: `ERROR_MISCONFIGURED_MCP_SERVER_${name.toUpperCase()}` }; 
      }

      return {
        id: crypto.randomUUID(),
        name: name,
        displayName: details.displayName || name, 
        transport: transport,
        enabled: !details.disabled, // Convert disabled (config) to enabled (UI)
      };
    });

    return NextResponse.json(serversForUI);
  } catch (error) {
    console.error('Failed to read or parse mcp-config:', error);
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json([]);
    }
    return NextResponse.json({ message: 'Error fetching MCP server configurations', error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newServersConfigFromUI = await request.json() as MCPServerConfigFromUI[];
    
    const configToWrite: PiperConfig = { mcpServers: {} };

    for (const serverUI of newServersConfigFromUI) {
      const { name, displayName, transport, enabled, ...rest } = serverUI; 
      
      let storedEntry: StoredMCPServerEntry = {
        disabled: !enabled,
        // Only store displayName if it's different from the actual server name (key)
        // or if it was explicitly provided (even if same, to preserve user's intent if they typed it)
        displayName: displayName && displayName !== name ? displayName : (serverUI.displayName ? serverUI.displayName : undefined),
        ...rest 
      };

      if (transport.type === 'stdio') {
        storedEntry = {
          ...storedEntry,
          transportType: 'stdio',
          command: transport.command,
          args: transport.args,
          env: transport.env,
          cwd: transport.cwd,
        };
        // Remove http/sse specific fields if they somehow got there
        delete storedEntry.url;
        delete storedEntry.headers;
      } else if (transport.type === 'sse' || transport.type === 'http') {
        storedEntry = {
          ...storedEntry,
          transportType: transport.type,
          url: transport.url,
          headers: transport.headers,
        };
        // Remove stdio specific fields
        delete storedEntry.command;
        delete storedEntry.args;
        delete storedEntry.env;
        delete storedEntry.cwd;
      }
      
      // Clean up undefined optional fields to keep config.json tidy
      Object.keys(storedEntry).forEach(key => {
        const K = key as keyof StoredMCPServerEntry;
        if (storedEntry[K] === undefined) {
          delete storedEntry[K];
        }
      });

      configToWrite.mcpServers[name] = storedEntry;
    }

    await fs.writeFile(configFilePath, JSON.stringify(configToWrite, null, 2), 'utf-8');
    
    // Trigger automatic initialization of new servers
    try {
      console.log('[MCP Config API] Config saved successfully. Checking for new servers to initialize...');
      const { checkAndInitializeNewServers } = await import('../../../lib/mcp/mcpManager');
      await checkAndInitializeNewServers();
      console.log('[MCP Config API] New server initialization check completed.');
    } catch (initError) {
      console.error('[MCP Config API] Error during new server initialization:', initError);
      // Don't fail the config save if initialization fails
    }
    
    return NextResponse.json({ message: 'Configuration saved successfully' });

  } catch (error) {
    console.error('Failed to save mcp-config:', error);
    return NextResponse.json({ message: 'Error saving MCP server configurations', error: (error as Error).message }, { status: 500 });
  }
}
