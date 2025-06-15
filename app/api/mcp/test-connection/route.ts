import { NextResponse, NextRequest } from 'next/server';
import { createMCPClientFromConfig } from '@/lib/mcp/enhanced/client-factory';
import { ServerConfigEntry, MCPToolSet, EnhancedStdioConfig, EnhancedSSEConfig, EnhancedStreamableHTTPConfig, EnhancedMCPClient } from '@/lib/mcp/enhanced/types';
import { appLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  let client: (EnhancedMCPClient | MCPToolSet) | undefined; // More specific type for client
  try {
    const requestBody = await request.json();
    // Basic validation for serverConfig and transport property
    if (!requestBody || typeof requestBody !== 'object' || !requestBody.transport || typeof requestBody.transport !== 'object') {
      appLogger.logSource('MCP').error('Invalid server configuration received for test-connection: missing or invalid transport.', { receivedConfig: requestBody });
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
      appLogger.logSource('MCP').error('Transport configuration is missing in serverConfig for test-connection.', { serverId, config: serverConfig });
      return NextResponse.json({ error: 'Transport configuration is missing' }, { status: 400 });
    }

    if (transportConfig.type === 'stdio') {
      if (!('command' in transportConfig) || !transportConfig.command) {
        appLogger.logSource('MCP').error('Missing command for stdio transport in server configuration during test-connection.', { serverId, config: serverConfig });
        return NextResponse.json({ error: 'Missing command for stdio transport in server configuration' }, { status: 400 });
      }
      validatedConfig = serverConfig as EnhancedStdioConfig;
    } else if (transportConfig.type === 'sse') {
      if (!('url' in transportConfig) || !transportConfig.url) {
        appLogger.logSource('MCP').error('Missing url for sse transport in server configuration during test-connection.', { serverId, config: serverConfig });
        return NextResponse.json({ error: 'Missing url for sse transport in server configuration' }, { status: 400 });
      }
      validatedConfig = serverConfig as EnhancedSSEConfig;
    } else if (transportConfig.type === 'streamable-http') { // Corrected type string
       if (!('url' in transportConfig) || !transportConfig.url) {
        appLogger.logSource('MCP').error('Missing url for streamable-http transport in server configuration during test-connection.', { serverId, config: serverConfig });
        return NextResponse.json({ error: 'Missing url for streamable-http transport in server configuration' }, { status: 400 });
      }
      validatedConfig = serverConfig as EnhancedStreamableHTTPConfig;
    } else {
      const unknownTransportType = (transportConfig as { type?: unknown }).type;
      appLogger.logSource('MCP').error('Invalid transport type in server configuration during test-connection.', { serverId, transportType: unknownTransportType });
      return NextResponse.json({ error: 'Invalid transport type in server configuration' }, { status: 400 });
    }

    client = await createMCPClientFromConfig(serverId, validatedConfig);

    // Attempt a lightweight operation to verify the connection is active
    if (!client) { // Ensure client was initialized
      appLogger.logSource('MCP').error('MCP client was not initialized prior to health check during test-connection.', { serverId });
      throw new Error('MCP client initialization failed');
    }
    const healthy = await client.healthCheck();
    if (!healthy) {
      // Log the failure before throwing, so it's captured server-side
      appLogger.logSource('MCP').warn('MCP client health check failed during test-connection.', { serverId, configType: validatedConfig.transport.type });
      throw new Error('MCP client health check failed');
    }

    // If the above operation succeeds, the connection is considered successful
    appLogger.logSource('MCP').info('MCP connection test successful.', { serverId, configType: validatedConfig.transport.type });
    return NextResponse.json({ message: 'Connection successful' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    appLogger.logSource('MCP').error('Error during MCP test-connection:', { error: errorMessage });
    // Ensure client is cleaned up if it was partially initialized and an error occurred
    if (client && 'cleanup' in client && typeof client.cleanup === 'function') {
      await client.cleanup();
    }
    return NextResponse.json({ error: 'Connection failed', details: errorMessage }, { status: 500 });
  } finally {
    // Final cleanup, regardless of success or failure within the try block
    if (client && 'cleanup' in client && typeof client.cleanup === 'function') {
      try {
        await client.cleanup();
      } catch (cleanupError: unknown) {
        const cleanupErrorMessage = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
        appLogger.logSource('MCP').error('Error during MCP client cleanup in test-connection:', { error: cleanupErrorMessage });
      }
    }
  }
}
