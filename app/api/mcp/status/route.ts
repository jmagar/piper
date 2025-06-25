// app/api/mcp/status/route.ts
import { NextResponse } from 'next/server';
import { initializeMCPManager, getManagedClient } from '@/lib/mcp/mcpManager';
import { getAppConfig, getCachedConfiguredServers, getCachedServerConfig } from '@/lib/mcp/enhanced/cached-config';

export async function GET() {
  const appConfig = await getAppConfig();
  await initializeMCPManager(appConfig);
  try {
    const configuredServerKeys = await getCachedConfiguredServers();
    const statuses = [];

    for (const serverKey of configuredServerKeys) {
      const client = getManagedClient(serverKey);
      const serverConfig = await getCachedServerConfig(serverKey); // To get the 'disabled' status

      if (client && serverConfig) {
        const clientStatus = await client.getStatus();
        statuses.push({
          ...clientStatus,
          enabled: !serverConfig.disabled, // Add the enabled status
        });
      } else if (serverConfig) {
        // Client might not be initialized if disabled or an early error occurred
        statuses.push({
          status: serverConfig.disabled ? 'disabled' : 'error',
          error: serverConfig.disabled ? 'Server is disabled in configuration.' : 'Client not found or failed to initialize.',
          toolsCount: 0,
          displayName: serverConfig.label || serverKey,
          serverKey: serverKey,
          transportType: serverConfig.transport?.type || 'unknown',
          enabled: !serverConfig.disabled,
        });
      }
    }

    return NextResponse.json(statuses);
  } catch (error) {
    console.error('Error fetching MCP statuses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MCP statuses', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
