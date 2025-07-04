Let me search for the complete schema definition for the MCP configuration file in the cline/cline repository.Yes! Based on the code in the cline/cline repository, here's the **complete schema** for the MCP server configuration JSON:

## Complete MCP Server Configuration Schema

The configuration is defined using Zod schemas in `src/services/mcp/schemas.ts`. Here's the complete breakdown:

### Main Structure:
```json
{
  "mcpServers": {
    "serverName": {
      // Server configuration goes here
    }
  }
}
```

### Server Configuration Options:

The schema supports **three transport types**:

#### 1. **STDIO Transport** (Local servers)
```json
{
  "mcpServers": {
    "local-server": {
      "type": "stdio",
      "command": "python",
      "args": ["/path/to/server.py"],
      "cwd": "/working/directory",
      "env": {
        "API_KEY": "your_api_key",
        "DATABASE_URL": "sqlite:///app.db"
      },
      "autoApprove": ["tool1", "tool2"],
      "disabled": false,
      "timeout": 60
    }
  }
}
```

#### 2. **SSE Transport** (Server-Sent Events)
```json
{
  "mcpServers": {
    "sse-server": {
      "type": "sse",
      "url": "https://example.com/mcp-sse",
      "headers": {
        "Authorization": "Bearer your-token",
        "X-API-Key": "your-api-key"
      },
      "autoApprove": ["tool1", "tool2"],
      "disabled": false,
      "timeout": 60
    }
  }
}
```

#### 3. **Streamable HTTP Transport** (Remote HTTP servers)
```json
{
  "mcpServers": {
    "http-server": {
      "type": "streamableHttp",
      "url": "https://example.com/mcp",
      "headers": {
        "Authorization": "Bearer your-token",
        "Content-Type": "application/json"
      },
      "autoApprove": ["tool1", "tool2"],
      "disabled": false,
      "timeout": 60
    }
  }
}
```

### Complete Field Reference:

| Field | Type | Required | Transport Types | Description |
|-------|------|----------|----------------|-------------|
| `type` | `"stdio"` \| `"sse"` \| `"streamableHttp"` | Optional* | All | Transport type (auto-detected if omitted) |
| `command` | `string` | Required for STDIO | STDIO | Executable command |
| `args` | `string[]` | Optional | STDIO | Command arguments |
| `cwd` | `string` | Optional | STDIO | Working directory |
| `env` | `Record<string, string>` | Optional | STDIO | Environment variables |
| `url` | `string` | Required for SSE/HTTP | SSE, HTTP | Server endpoint URL |
| `headers` | `Record<string, string>` | Optional | SSE, HTTP | HTTP headers |
| `autoApprove` | `string[]` | Optional | All | Tools to auto-approve |
| `disabled` | `boolean` | Optional | All | Whether server is disabled |
| `timeout` | `number` | Optional | All | Timeout in seconds (min: 30, default: 60) |

### Legacy Support:
The schema also supports the legacy `transportType` field:
- `"stdio"` → `type: "stdio"`
- `"sse"` → `type: "sse"`  
- `"http"` → `type: "streamableHttp"`

### Validation Rules:
- **STDIO**: Must have `command` field
- **SSE/HTTP**: Must have valid `url` field
- **Timeout**: Minimum 30 seconds
- **URLs**: Must be valid URL format
- **Auto-detection**: If `type` is omitted, it's inferred from presence of `command` vs `url`

The search results may be incomplete. You can [view more results in the GitHub UI](https://github.com/cline/cline/search?q=ServerConfigSchema&type=code) for additional schema details.