import { NextRequest, NextResponse } from "next/server"

// Global map to track active abort controllers
const activeAbortControllers = new Map<string, AbortController>()

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
      const abortController = activeAbortControllers.get(callId)
      if (abortController) {
        abortController.abort()
        activeAbortControllers.delete(callId)
        
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
      let abortedCount = 0
      for (const [callId, controller] of activeAbortControllers.entries()) {
        controller.abort()
        activeAbortControllers.delete(callId)
        abortedCount++
      }
      
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
      let abortedCount = 0
      for (const [callId, controller] of activeAbortControllers.entries()) {
        if (callId.startsWith(serverId)) {
          controller.abort()
          activeAbortControllers.delete(callId)
          abortedCount++
        }
      }
      
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
    const activeExecutions = Array.from(activeAbortControllers.keys())
    
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

// Helper function to register abort controllers (called by tool execution)
export function registerAbortController(callId: string, controller: AbortController) {
  activeAbortControllers.set(callId, controller)
  
  // Clean up when aborted
  controller.signal.addEventListener('abort', () => {
    activeAbortControllers.delete(callId)
  })
  
  // Auto-cleanup after 5 minutes for safety
  setTimeout(() => {
    if (activeAbortControllers.has(callId)) {
      activeAbortControllers.delete(callId)
    }
  }, 5 * 60 * 1000)
} 