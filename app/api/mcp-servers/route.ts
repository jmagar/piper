// app/api/mcp-servers/route.ts
import { NextResponse } from 'next/server';
import { getManagedServersInfo, ManagedServerInfo } from '@/lib/mcp/mcpManager'; // Adjust path as necessary

// The McpServerInfo interface expected by the frontend dashboard
// It should be compatible with ManagedServerInfo from mcpManager
export interface McpServerInfo extends ManagedServerInfo {}

export async function GET() {
  console.log('[API /api/mcp-servers] Received request.');
  try {
    // The mcpManager is initialized when its module is first loaded.
    // We just need to call its function to get the current state of all managed servers.
    const serversInfo: ManagedServerInfo[] = await getManagedServersInfo();
    
    console.log(`[API /api/mcp-servers] Fetched info for ${serversInfo.length} servers from MCP Manager.`);
    return NextResponse.json(serversInfo);

  } catch (error: any) {
    console.error('[API /api/mcp-servers] Failed to get MCP server statuses from MCP Manager:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get MCP server statuses.', 
        details: error.message || String(error) 
      },
      { status: 500 }
    );
  }
}
