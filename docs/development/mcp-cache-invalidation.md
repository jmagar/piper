# MCP Cache Invalidation

## Overview

The MCP (Model Context Protocol) system uses Redis caching to improve performance by storing configuration data. However, when configuration files are manually edited outside of the application's API, the cache can become stale and cause the application to use outdated settings.

## Cache Invalidation API

### Endpoint

```
GET /api/mcp/invalidate-cache
```

### Purpose

This endpoint manually clears the MCP configuration cache, forcing the application to reload the configuration from the `config/config.json` file on the next request.

### When to Use

- After manually editing `config/config.json`
- When MCP servers aren't reflecting configuration changes
- When debugging MCP connection issues
- When you see cached error messages that don't match current configuration

### Usage

```bash
# Clear the MCP configuration cache
curl http://localhost:8630/api/mcp/invalidate-cache

# Response on success:
{
  "message": "MCP config cache invalidated successfully."
}

# Response on error:
{
  "error": "Failed to invalidate MCP config cache",
  "details": "Error message here"
}
```

### Workflow

1. Edit `config/config.json` manually
2. Call the invalidation endpoint
3. Restart the application (if needed)
4. Check MCP server status at `/api/mcp-servers`

### Alternative Methods

Instead of using this endpoint, you can also:

1. **Restart the application** - This will clear all caches
2. **Use the configuration API** - Changes made through `/api/mcp/config` automatically invalidate the cache
3. **Wait for cache expiration** - The cache has a TTL, but this may take time

### Implementation Details

The endpoint calls the `invalidateConfigCache()` function from `lib/mcp/enhanced/cached-config.ts`, which:

1. Clears the Redis cache key for MCP configuration
2. Logs the operation for debugging
3. Forces the next configuration request to read from the file system

### Security

- This endpoint has no authentication (development/debugging feature)
- Consider adding authentication if used in production
- The endpoint only clears cache, it doesn't expose sensitive data

### Troubleshooting

If the cache invalidation doesn't seem to work:

1. Check that Redis is running and accessible
2. Verify the Redis connection in application logs
3. Ensure the `config/config.json` file has valid JSON syntax
4. Check file permissions on the config file
5. Restart the application as a last resort

### Related Files

- `app/api/mcp/invalidate-cache/route.ts` - The API endpoint implementation
- `lib/mcp/enhanced/cached-config.ts` - Cache management logic
- `config/config.json` - The configuration file being cached 