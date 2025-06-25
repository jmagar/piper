import { NextResponse, NextRequest } from 'next/server';
import { createMCPClientFromConfig } from '@/lib/mcp/enhanced/client-factory';
import { ServerConfigEntry, MCPToolSet, EnhancedStdioConfig, EnhancedSSEConfig, EnhancedStreamableHTTPConfig } from '@/lib/mcp/enhanced/types';
import { appLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  let client: MCPToolSet | undefined; // More specific type for client
  try {
    const requestBody = await request.json();
    // Basic validation for serverConfig and transport property
    if (!requestBody || typeof requestBody !== 'object' || !requestBody.transport || typeof requestBody.transport !== 'object') {
      appLogger.error('Invalid server configuration received for test-connection: missing or invalid transport.', { 
        args: { receivedConfig: requestBody }
      });
      return NextResponse.json({ error: 'Invalid server configuration: missing or invalid transport property.' }, { status: 400 });
    }
    const serverConfig = requestBody as ServerConfigEntry; // Cast after basic validation

    if (!serverConfig) {
      return NextResponse.json({ error: 'Missing server configuration in request body' }, { status: 400 });
    }

    // Create a temporary client to test the connection
    // The first argument to createMCPClientFromConfig should be a serverId string.
    // For a test, we can use a placeholder or derive from config if available.
    const serverId = serverConfig.name || 'test-connection-client';

    // Validate and type assert serverConfig before passing to the factory
    let validatedConfig: EnhancedStdioConfig | EnhancedSSEConfig | EnhancedStreamableHTTPConfig;

    const transportConfig = serverConfig.transport;
    if (!transportConfig) { // Added null check for transportConfig itself
      appLogger.error('Transport configuration is missing in serverConfig for test-connection.', { 
        args: { serverId, config: serverConfig }
      });
      return NextResponse.json({ error: 'Transport configuration is missing' }, { status: 400 });
    }

    if (transportConfig.type === 'stdio') {
      if (!('command' in transportConfig) || !transportConfig.command) {
        appLogger.error('Missing command for stdio transport in server configuration during test-connection.', { 
          args: { serverId, config: serverConfig }
        });
        return NextResponse.json({ error: 'Missing command for stdio transport in server configuration' }, { status: 400 });
      }
      validatedConfig = serverConfig as EnhancedStdioConfig;
    } else if (transportConfig.type === 'sse') {
      if (!('url' in transportConfig) || !transportConfig.url) {
        appLogger.error('Missing url for sse transport in server configuration during test-connection.', { 
          args: { serverId, config: serverConfig }
        });
        return NextResponse.json({ error: 'Missing url for sse transport in server configuration' }, { status: 400 });
      }
      validatedConfig = serverConfig as EnhancedSSEConfig;
    } else if (transportConfig.type === 'streamable-http') { // Corrected type string
       if (!('url' in transportConfig) || !transportConfig.url) {
        appLogger.error('Missing url for streamable-http transport in server configuration during test-connection.', { 
          args: { serverId, config: serverConfig }
        });
        return NextResponse.json({ error: 'Missing url for streamable-http transport in server configuration' }, { status: 400 });
      }
      validatedConfig = serverConfig as EnhancedStreamableHTTPConfig;
    } else {
      const unknownTransportType = (transportConfig as { type?: unknown }).type;
      appLogger.error('Invalid transport type in server configuration during test-connection.', { 
        args: { serverId, transportType: unknownTransportType }
      });
      return NextResponse.json({ error: 'Invalid transport type in server configuration' }, { status: 400 });
    }

    client = await createMCPClientFromConfig(serverId, validatedConfig);

    // Attempt a lightweight operation to verify the connection is active
    if (!client) { // Ensure client was initialized
      appLogger.error('MCP client was not initialized prior to health check during test-connection.', { 
        args: { serverId }
      });
      throw new Error('MCP client initialization failed');
    }
    const healthy = await client.healthCheck?.();
    if (!healthy) {
      // Log the failure before throwing, so it's captured server-side
      appLogger.warn('MCP client health check failed during test-connection.', { 
        args: { serverId, configType: transportConfig.type }
      });
      throw new Error('MCP client health check failed');
    }

    // If the above operation succeeds, the connection is considered successful
    appLogger.info('MCP connection test successful.', { 
      args: { serverId, configType: transportConfig.type }
    });
    return NextResponse.json({ message: 'Connection successful' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    appLogger.error('Error during MCP test-connection:', { 
      error: error as Error
    });
    // Ensure client is cleaned up if it was partially initialized and an error occurred
    if (client && 'close' in client && typeof client.close === 'function') {
      await client.close();
    }
    return NextResponse.json({ error: 'Connection failed', details: errorMessage }, { status: 500 });
  } finally {
    // Final cleanup, regardless of success or failure within the try block
    if (client && 'close' in client && typeof client.close === 'function') {
      try {
        await client.close();
      } catch (cleanupError: unknown) {
        appLogger.error('Error during MCP client cleanup in test-connection:', { 
          error: cleanupError as Error
        });
      }
    }
  }
}
