import { NextResponse } from 'next/server';
import { invalidateConfigCache } from '@/lib/mcp/enhanced/cached-config';
import { appLogger } from '@/lib/logger';

export async function GET() {
  appLogger.info('[API /api/mcp/invalidate-cache] Received request to invalidate config cache.');
  try {
    await invalidateConfigCache();
    appLogger.info('[API /api/mcp/invalidate-cache] MCP config cache invalidated successfully.');
    return NextResponse.json({ message: 'MCP config cache invalidated successfully.' });
  } catch (error) {
    appLogger.error('[API /api/mcp/invalidate-cache] Failed to invalidate MCP config cache:', { error });
    return NextResponse.json(
      { 
        error: 'Failed to invalidate MCP config cache.', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 