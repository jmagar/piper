// Global map to track active abort controllers
const activeAbortControllers = new Map<string, AbortController>()

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

// Get abort controller by call ID
export function getAbortController(callId: string): AbortController | undefined {
  return activeAbortControllers.get(callId)
}

// Get all active controller IDs
export function getActiveExecutions(): string[] {
  return Array.from(activeAbortControllers.keys())
}

// Abort specific execution
export function abortExecution(callId: string): boolean {
  const controller = activeAbortControllers.get(callId)
  if (controller) {
    controller.abort()
    activeAbortControllers.delete(callId)
    return true
  }
  return false
}

// Abort all executions
export function abortAllExecutions(): number {
  let count = 0
  for (const [callId, controller] of activeAbortControllers.entries()) {
    controller.abort()
    activeAbortControllers.delete(callId)
    count++
  }
  return count
}

// Abort all executions from a specific server
export function abortServerExecutions(serverId: string): number {
  let count = 0
  for (const [callId, controller] of activeAbortControllers.entries()) {
    if (callId.startsWith(serverId)) {
      controller.abort()
      activeAbortControllers.delete(callId)
      count++
    }
  }
  return count
} 