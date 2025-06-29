// app/api/mcp-servers/route.ts
import { NextResponse } from 'next/server';
import { getManagedServersInfo, ManagedServerInfo } from '@/lib/mcp/mcpManager'; // Adjust path as necessary
import { appLogger } from '@/lib/logger';

// The McpServerInfo interface expected by the frontend dashboard
// It should be compatible with ManagedServerInfo from mcpManager
export type McpServerInfo = ManagedServerInfo;

export async function GET() {
  appLogger.info('[API /api/mcp-servers] Received request.');
  try {
    // The mcpManager is initialized when its module is first loaded.
    // We just need to call its function to get the current state of all managed servers.
    const serversInfo: ManagedServerInfo[] = await getManagedServersInfo();
    
    appLogger.info(`[API /api/mcp-servers] Fetched info for ${serversInfo.length} servers from MCP Manager.`);
    return NextResponse.json(serversInfo);

  } catch (error: unknown) {
    appLogger.error('[API /api/mcp-servers] Failed to get MCP server statuses from MCP Manager', { error });
    return NextResponse.json(
      { 
        error: 'Failed to get MCP server statuses.', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === 'initialize_new_servers') {
      appLogger.info('[MCP Servers API] Manual trigger for new server initialization...');
      const { checkAndInitializeNewServers } = await import('../../../lib/mcp/mcpManager');
      await checkAndInitializeNewServers();
      appLogger.info('[MCP Servers API] Manual new server initialization completed.');
      return NextResponse.json({ message: 'New server initialization triggered successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "initialize_new_servers"' }, { status: 400 });
    }
  } catch (error) {
    appLogger.error('[MCP Servers API] Error during POST action', { error });
    return NextResponse.json(
      { error: 'Failed to execute action', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
