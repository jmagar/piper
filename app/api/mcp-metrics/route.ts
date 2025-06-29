import { NextResponse } from "next/server"
import { appLogger } from "@/lib/logger"
import { 
  getEnhancedMCPMetrics, 
  performMCPHealthCheck, 
  getMCPPoolStats 
} from "@/lib/mcp/enhanced-integration"

export async function GET() {
  try {
    const [metrics, healthCheck, poolStats] = await Promise.all([
      getEnhancedMCPMetrics(),
      performMCPHealthCheck(),
      getMCPPoolStats()
    ])

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        metrics,
        health: healthCheck,
        pool: poolStats
      }
    })
  } catch (error) {
    appLogger.error("Failed to fetch enhanced MCP metrics", { error })
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch metrics",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 