export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run on the server side
    console.log('Initializing MCP Manager on server startup...');
    await import('./lib/mcp/mcpManager');
    console.log('MCP Manager initialized successfully.');
  }
} 