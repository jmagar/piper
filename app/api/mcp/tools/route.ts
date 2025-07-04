import { getManagedServersInfo } from "@/lib/mcp/mcpManager"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const serversInfo = await getManagedServersInfo()
    
    const mcpTools = serversInfo
      .filter(server => server.status === 'success' && server.tools.length > 0)
      .flatMap(server => 
        server.tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          serverId: server.key,
          serverLabel: server.label,
          fullId: `${server.key}_${tool.name}` // This matches how tools are prefixed in getCombinedMCPToolsForAISDK
        }))
      )

    return NextResponse.json({ tools: mcpTools })
  } catch (error) {
    console.error("Failed to fetch MCP tools:", error)
    return NextResponse.json({ tools: [] })
  }
} 