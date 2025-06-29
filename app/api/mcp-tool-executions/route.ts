import { NextResponse } from "next/server"
import { globalMetricsCollector } from "@/lib/mcp/enhanced-integration"
import { appLogger } from "@/lib/logger"

interface ToolExecutionRecord {
  id: string
  toolName: string
  serverId: string
  executionTime: number
  success: boolean
  executedAt: string
  errorType?: string
  errorMessage?: string
}

export async function GET() {
  try {
    // Get aggregated tool execution stats from the Enhanced MCP Client
    const stats = await globalMetricsCollector.getToolExecutionStats()
    
    if (!stats) {
      // Return empty data structure if no executions yet
      return NextResponse.json({
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        mostUsedTool: '',
        recentExecutions: []
      })
    }

    // Transform the database results to match our UI interface
    const recentExecutions = (stats.recentExecutions as ToolExecutionRecord[]).map((execution: ToolExecutionRecord) => ({
      id: execution.id,
      toolName: execution.toolName,
      serverKey: execution.serverId,
      executionTime: execution.executionTime,
      success: execution.success,
      timestamp: execution.executedAt,
      errorType: execution.errorType,
      errorMessage: execution.errorMessage
    }))

    // Find most used tool from recent executions
    const toolCounts = recentExecutions.reduce((acc: Record<string, number>, exec) => {
      acc[exec.toolName] = (acc[exec.toolName] || 0) + 1
      return acc
    }, {})
    
    const mostUsedTool = Object.keys(toolCounts).reduce((a, b) => 
      toolCounts[a] > toolCounts[b] ? a : b, ''
    )

    return NextResponse.json({
      totalExecutions: stats.totalExecutions,
      successfulExecutions: stats.successCount,
      failedExecutions: stats.failureCount,
      averageExecutionTime: Math.round(stats.averageExecutionTime),
      mostUsedTool,
      recentExecutions
    })
  } catch (error) {
    appLogger.error("Failed to fetch tool execution data", { error })
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch tool execution data",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 