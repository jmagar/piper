import { NextResponse } from "next/server"
import { getAppConfig } from "@/lib/mcp/enhanced-mcp-client"

export interface MCPServerOption {
  key: string
  label: string
  transportType: string
  status?: string
}

export async function GET() {
  try {
    const appConfig = getAppConfig()
    
    if (!appConfig || !appConfig.mcpServers) {
      console.error("[API /api/agents/mcp-options] MCP server configuration is missing or invalid")
      return NextResponse.json(
        { error: "MCP server configuration not available" },
        { status: 500 }
      )
    }

    const servers: MCPServerOption[] = []

    // Process each server in the config
    for (const [key, serverConfig] of Object.entries(appConfig.mcpServers)) {
      // Skip disabled servers
      if (serverConfig.disabled === true) {
        continue
      }

      // Determine transport type
      let transportType = 'unknown'
      if (serverConfig.transport?.type) {
        transportType = serverConfig.transport.type
      } else if (serverConfig.url) {
        transportType = 'sse'
      } else if (serverConfig.command) {
        transportType = 'stdio'
      }

      servers.push({
        key,
        label: serverConfig.label || key,
        transportType,
      })
    }

    console.log(`[API /api/agents/mcp-options] Returning ${servers.length} enabled MCP servers`)
    return NextResponse.json({ servers })

  } catch (error) {
    console.error("[API /api/agents/mcp-options] Error fetching MCP server options:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch MCP server options",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 