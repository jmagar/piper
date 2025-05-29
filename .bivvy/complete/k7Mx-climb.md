<Climb>
  <header>
    <id>k7Mx</id>
    <type>bug</type>
    <description>Fix SSE MCP Tools Integration - SSE MCP servers are connected but tools are not accessible to the AI SDK</description>
  </header>
  <newDependencies>None - this is a bug fix using existing dependencies</newDependencies>
  <prerequisiteChanges>None - this is fixing existing broken functionality</prerequisiteChanges>
  <relevantFiles>
    - lib/mcp/mcpManager.ts (main integration logic)
    - lib/mcp/client.ts (MCP service configuration)
    - lib/mcp/load-mcp-from-url.ts (SSE tool loading utility)
    - config.json (MCP server configurations)
  </relevantFiles>
  <everythingElse>

## Problem Statement
SSE MCP servers are successfully connecting and discovering tools (showing 107 SSE tools total), but when `getCombinedMCPToolsForAISDK()` tries to load them for the AI SDK, it fails with "invalid transport config: undefined". The servers show as connected with tools, but 0 SSE tools are actually loaded for use.

## Root Cause Analysis
The config.json stores SSE servers with just a `url` field (legacy format):
```json
{
  "mcp-unraid": {
    "url": "http://10.1.0.2:9156/mcp",
    "disabled": false
  }
}
```

During initialization in `initializeMCPManager()`, the code correctly converts this to a proper transport object:
```typescript
if (serverConfig.url) {
  serverConfig.transport = {
    type: 'sse',
    url: serverConfig.url,
    headers: serverConfig.headers
  };
}
```

However, when `getCombinedMCPToolsForAISDK()` later calls `getAppConfig()`, it reads the raw config file again, which still only has the `url` field and NO transport object. This causes the SSE tool loading to fail.

## Success Metrics
- All connected SSE MCP servers (currently ~10 servers with 107 tools total) should have their tools loaded and available to the AI SDK
- The tool count should show "📡 SSE tools: 107" instead of "📡 SSE tools: 0"
- SSE tools should be invokable by the AI model without errors
- No changes needed to config.json format (maintain backward compatibility)

## Technical Requirements
1. **Transport Object Creation**: Replicate the transport object creation logic from `initializeMCPManager` in `getCombinedMCPToolsForAISDK`
2. **Proper Tool Loading**: Use `loadMCPToolsFromURL` with the correct SSE transport configuration
3. **Error Handling**: Graceful fallback if transport object creation fails
4. **Backward Compatibility**: Support both legacy config format (just `url`) and new format (explicit `transport` object)

## Implementation Details
The fix should modify `getCombinedMCPToolsForAISDK()` in `lib/mcp/mcpManager.ts` to:

1. **Create Transport Object**: If `serverConfig.transport` is undefined but `serverConfig.url` exists, create the transport object:
   ```typescript
   let transport = serverConfig.transport;
   if (!transport && serverConfig.url) {
     transport = {
       type: 'sse',
       url: serverConfig.url,
       headers: serverConfig.headers
     };
   }
   ```

2. **Use Proper URL**: Pass `transport.url` to `loadMCPToolsFromURL` instead of trying to access `serverConfig.transport.url` when transport is undefined

3. **Remove Manual Invocation**: SSE tools from `loadMCPToolsFromURL` should be added directly to `combinedTools` without any manual execute wrapper (AI SDK handles invocation automatically)

## Current Debug Output Shows
```
[MCP Manager] 🔍 Debug config for SSE server 'mcp-unraid': {
  serverKey: 'mcp-unraid',
  serverConfigExists: true,
  serverConfigKeys: [ 'url', 'disabled' ],
  transport: undefined,           // ← This is the problem
  transportType: undefined,
  url: 'http://10.1.0.2:9156/mcp', // ← This exists and should be used
  fullServerConfig: { url: 'http://10.1.0.2:9156/mcp', disabled: false }
}
```

## Expected After Fix
```
[MCP Manager] 🔧 Using loadMCPToolsFromURL for SSE server 'mcp-unraid' at http://10.1.0.2:9156/mcp
[MCP Manager] ✅ Loaded 19 SSE tools from 'mcp-unraid': [tool1, tool2, ...]
[MCP Manager] 📡 SSE tools: 107
```

## Testing Approach
1. **Verify Tool Loading**: Check that SSE tool count goes from 0 to 107
2. **Test Tool Invocation**: Verify that AI can actually use SSE tools (e.g., mcp-unraid tools)
3. **Backward Compatibility**: Ensure both config formats work
4. **Error Handling**: Test with invalid URLs to ensure graceful failures

## Edge Cases
- Servers with `transport` object already defined (should work as-is)
- Servers with `url` but no headers (should work with undefined headers)
- Servers with malformed URLs (should fail gracefully)
- Mixed server types (STDIO + SSE) in same session

## Known Limitations
- This fix doesn't modify the config file format, so the transport object creation will happen on every call to `getCombinedMCPToolsForAISDK`
- Still relies on the separate status monitoring system for server health

  </everythingElse>
</Climb> 