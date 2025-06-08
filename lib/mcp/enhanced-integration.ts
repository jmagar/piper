import { MCPMetricsCollector, globalMCPPool } from './enhanced-mcp-client'
import { getManagedServersInfo } from './mcpManager'

/**
 * Enhanced MCP Integration Helper
 * Provides additional functionality for the Enhanced MCP Client
 */

// Global metrics collector instance
const globalMetricsCollector = new MCPMetricsCollector(true)

interface EnhancedServerMetrics {
  key: string
  label: string
  status: string
  toolsCount: number
  transportType: string
  metrics: unknown
  toolStats: unknown
}

/**
 * Get comprehensive MCP metrics across all servers
 */
export async function getEnhancedMCPMetrics() {
  try {
    const serversInfo = await getManagedServersInfo();
    const globalSummary = await globalMetricsCollector.getGlobalSummaryMetrics(); // Fetch new global metrics

    const metrics = {
      servers: [] as EnhancedServerMetrics[],
      summary: {
        totalServers: 0,
        connectedServers: 0,
        totalTools: 0,
        errorServers: 0,
        // Integrate new global summary metrics
        totalRequests: globalSummary.totalRequests,
        errorRate: globalSummary.errorRate,
        avgResponseTime: globalSummary.avgResponseTime,
        activeUsers: globalSummary.activeUsers,
      }
    };

    for (const server of serversInfo) {
      // Get server-specific metrics
      const serverMetrics = await globalMetricsCollector.getServerMetrics(server.key)
      const toolStats = await globalMetricsCollector.getToolExecutionStats(server.key)

      metrics.servers.push({
        key: server.key,
        label: server.label,
        status: server.status,
        toolsCount: server.tools.length,
        transportType: server.transportType,
        metrics: serverMetrics,
        toolStats: toolStats
      })

      // Update summary
      metrics.summary.totalServers++
      if (server.status === 'success') {
        metrics.summary.connectedServers++
        metrics.summary.totalTools += server.tools.length
      } else if (server.status === 'error') {
        metrics.summary.errorServers++
      }
    }

    return metrics
  } catch (error) {
    console.error('[Enhanced MCP] Failed to get metrics:', error)
    return null
  }
}

/**
 * Get connection pool statistics
 */
export function getMCPPoolStats() {
  return globalMCPPool.getStats()
}

/**
 * Health check for Enhanced MCP system
 */
export async function performMCPHealthCheck() {
  try {
    const metrics = await getEnhancedMCPMetrics()
    const poolStats = getMCPPoolStats()
    
    const healthStatus = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      timestamp: new Date().toISOString(),
      details: {
        totalServers: metrics?.summary.totalServers || 0,
        connectedServers: metrics?.summary.connectedServers || 0,
        errorServers: metrics?.summary.errorServers || 0,
        totalTools: metrics?.summary.totalTools || 0,
        poolConnections: poolStats.totalConnections
      },
      recommendations: [] as string[]
    }

    // Determine overall health
    if (metrics) {
      const { totalServers, connectedServers, errorServers } = metrics.summary
      
      if (errorServers > totalServers * 0.5) {
        healthStatus.status = 'unhealthy'
        healthStatus.recommendations.push('More than 50% of servers are in error state')
      } else if (errorServers > 0 || connectedServers < totalServers * 0.8) {
        healthStatus.status = 'degraded'
        healthStatus.recommendations.push('Some servers are not connected or have errors')
      }

      if (healthStatus.details.totalTools === 0) {
        healthStatus.status = 'unhealthy'
        healthStatus.recommendations.push('No tools available from any server')
      }
    } else {
      healthStatus.status = 'unhealthy'
      healthStatus.recommendations.push('Unable to retrieve metrics')
    }

    return healthStatus
  } catch (error) {
    console.error('[Enhanced MCP] Health check failed:', error)
    return {
      status: 'unhealthy' as const,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendations: ['System health check failed - investigate Enhanced MCP Client']
    }
  }
}

/**
 * Enhanced error reporting with metrics
 */
export async function reportMCPError(
  serverKey: string, 
  toolName: string, 
  error: Error,
  context?: Record<string, unknown>
) {
  try {
    // Record the error in metrics
    await globalMetricsCollector.recordToolExecution(serverKey, toolName, {
      executionTime: 0,
      success: false,
      errorType: 'execution_error',
      errorMessage: error.message,
      metadata: context
    })

    console.error(`[Enhanced MCP] Error in ${serverKey}/${toolName}:`, {
      error: error.message,
      context,
      timestamp: new Date().toISOString()
    })
  } catch (metricsError) {
    console.error('[Enhanced MCP] Failed to record error metrics:', metricsError)
  }
}

/**
 * Cleanup function for Enhanced MCP resources
 */
export async function cleanupEnhancedMCP() {
  try {
    await globalMCPPool.closeAll()
    await globalMetricsCollector.cleanup()
    console.log('[Enhanced MCP] Cleanup completed successfully')
  } catch (error) {
    console.error('[Enhanced MCP] Cleanup failed:', error)
  }
}

// Export the global metrics collector for advanced usage
export { globalMetricsCollector } 