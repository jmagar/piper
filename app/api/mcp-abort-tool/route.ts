import { NextRequest, NextResponse } from "next/server"
import { 
  abortExecution, 
  abortAllExecutions, 
  abortServerExecutions, 
  getActiveExecutions 
} from "@/lib/mcp/abort-controller"

export async function POST(request: NextRequest) {
  try {
    const { action, callId, serverId } = await request.json()

    if (action === 'abort') {
      if (!callId) {
        return NextResponse.json(
          { error: "callId is required for abort action" },
          { status: 400 }
        )
      }

      // Abort specific tool execution
      const success = abortExecution(callId)
      if (success) {
        console.log(`[Abort API] Aborted tool execution: ${callId}`)
        
        return NextResponse.json({
          success: true,
          message: `Tool execution ${callId} aborted successfully`
        })
      } else {
        return NextResponse.json(
          { error: `No active execution found for callId: ${callId}` },
          { status: 404 }
        )
      }
    }

    if (action === 'abort-all') {
      // Abort all active tool executions
      const abortedCount = abortAllExecutions()
      
      console.log(`[Abort API] Aborted ${abortedCount} tool executions`)
      
      return NextResponse.json({
        success: true,
        message: `Aborted ${abortedCount} active tool executions`
      })
    }

    if (action === 'abort-server') {
      if (!serverId) {
        return NextResponse.json(
          { error: "serverId is required for abort-server action" },
          { status: 400 }
        )
      }

      // Abort all executions from a specific server
      const abortedCount = abortServerExecutions(serverId)
      
      console.log(`[Abort API] Aborted ${abortedCount} tool executions from server: ${serverId}`)
      
      return NextResponse.json({
        success: true,
        message: `Aborted ${abortedCount} tool executions from server ${serverId}`
      })
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'abort', 'abort-all', or 'abort-server'" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Failed to handle abort request:", error)
    return NextResponse.json(
      { 
        error: "Failed to process abort request",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const activeExecutions = getActiveExecutions()
    
    return NextResponse.json({
      success: true,
      activeExecutions,
      count: activeExecutions.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Failed to get active executions:", error)
    return NextResponse.json(
      { 
        error: "Failed to get active executions",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 