import { MCPMetricsCollector, globalMetricsCollector } from './enhanced/metrics-collector'
import { globalMCPPool } from './enhanced/connection-pool'
import { getManagedServersInfo } from './mcpManager'
import { redisCacheManager } from './modules'

/**
 * Enhanced MCP Integration Helper
 * Provides additional functionality for the Enhanced MCP Client
 */

// Use the existing global metrics collector instance
// const globalMetricsCollector = new MCPMetricsCollector(true) // REMOVED - Use existing instance

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
 * Health check for Enhanced MCP system with cached health results
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
      recommendations: [] as string[],
      cachedHealthChecks: {} as Record<string, { isHealthy: boolean; lastChecked: number }>
    }

    // Get cached health check results for all servers to provide more detailed health information
    if (metrics?.servers) {
      const serverKeys = metrics.servers.map(server => server.key);
      const cachedHealthResults = await redisCacheManager.getMultipleHealthCheckResults(serverKeys);
      
      // Map cached results to server keys
      serverKeys.forEach((key, index) => {
        const cached = cachedHealthResults[index];
        if (cached) {
          healthStatus.cachedHealthChecks[key] = {
            isHealthy: cached.isHealthy,
            lastChecked: cached.timestamp
          };
        }
      });
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

      // Add recommendations based on cached health check failures
      const unhealthyServers = Object.entries(healthStatus.cachedHealthChecks)
        .filter(([, health]) => !health.isHealthy)
        .map(([key]) => key);
      
      if (unhealthyServers.length > 0) {
        healthStatus.recommendations.push(`Health check failures detected for servers: ${unhealthyServers.join(', ')}`);
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