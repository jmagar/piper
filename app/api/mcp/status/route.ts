// app/api/mcp/status/route.ts
import { getCachedAppConfig as getAppConfig } from '@/lib/mcp/enhanced';
import { getManagedServersInfo } from '@/lib/mcp/mcpManager';
import { NextResponse } from 'next/server';

export async function GET() {
  const appConfig = await getAppConfig();
  if (!appConfig) {
    return NextResponse.json({ error: 'App configuration not found' }, { status: 500 });
  }
  
  // Do not initialize here. Rely on the background startup process.
  // await initializeMCPManager(appConfig);
  
  const serversInfo = await getManagedServersInfo(appConfig);
  return NextResponse.json(serversInfo);
}
