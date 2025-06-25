import { PrismaClient, Prisma } from "@prisma/client";
import { appLogger } from '@/lib/logger';
import {
  ServerMetrics,
  GlobalMCPSummary
} from './types';

/**
 * MCP Metrics Collector for tracking server performance and tool executions
 */
export class MCPMetricsCollector {
  private prisma: PrismaClient
  private enableMetrics: boolean
  private metricsCache = new Map<string, Record<string, unknown>>()

  constructor(enableMetrics: boolean = true) {
    this.enableMetrics = enableMetrics
    this.prisma = new PrismaClient()
  }

  async recordServerConnection(
    serverId: string,
    serverName: string,
    transportType: 'stdio' | 'sse' | 'streamable-http',
    toolsCount: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!this.enableMetrics) return

    try {
      const existingServer = await this.prisma.mCPServerMetric.findFirst({
        where: { serverId }
      })

      const metadataInput = metadata ? JSON.parse(JSON.stringify(metadata)) : {}

      if (existingServer) {
        await this.prisma.mCPServerMetric.updateMany({
          where: { serverId },
          data: {
            serverName,
            status: 'connected',
            connectionTime: new Date(),
            lastActiveAt: new Date(),
            toolsCount,
            metadata: metadataInput
          }
        })
      } else {
        await this.prisma.mCPServerMetric.create({
          data: {
            serverId,
            serverName,
            transportType,
            status: 'connected',
            connectionTime: new Date(),
            lastActiveAt: new Date(),
            toolsCount,
            metadata: metadataInput
          }
        })
      }

      console.log(`[Metrics] Recorded connection for server: ${serverName}`)
    } catch (error) {
      console.error('[Metrics] Failed to record server connection:', error)
    }
  }

  async recordServerDisconnection(
    serverId: string,
    errorCount?: number
  ): Promise<void> {
    if (!this.enableMetrics) return

    try {
      await this.prisma.mCPServerMetric.updateMany({
        where: { serverId },
        data: {
          status: 'disconnected',
          disconnectionTime: new Date(),
          errorCount: errorCount || 0
        }
      })

      console.log(`[Metrics] Recorded disconnection for server: ${serverId}`)
    } catch (error) {
      console.error('[Metrics] Failed to record server disconnection:', error)
    }
  }

  async recordServerError(
    serverId: string
  ): Promise<void> {
    if (!this.enableMetrics) return

    try {
      await this.prisma.mCPServerMetric.updateMany({
        where: { serverId },
        data: {
          status: 'error',
          errorCount: {
            increment: 1
          },
          lastActiveAt: new Date()
        }
      })

      console.log(`[Metrics] Recorded error for server: ${serverId}`)
    } catch (error) {
      console.error('[Metrics] Failed to record server error:', error)
    }
  }

  async recordToolExecution(
    serverId: string,
    toolName: string,
    execution: {
      executionTime: number
      success: boolean
      errorType?: string
      errorMessage?: string
      repairAttempts?: number
      repairSuccessful?: boolean
      inputSize?: number
      outputSize?: number
      outputType?: string
      aborted?: boolean
      cached?: boolean
      retryCount?: number
      callId?: string
      metadata?: Record<string, unknown>
    }
  ): Promise<void> {
    if (!this.enableMetrics) return

    try {
      const metadataInput = execution.metadata ? JSON.parse(JSON.stringify(execution.metadata)) : {}

      // Record tool execution
      await this.prisma.mCPToolExecution.create({
        data: {
          serverId,
          toolName,
          callId: execution.callId,
          executionTime: execution.executionTime,
          success: execution.success,
          errorType: execution.errorType,
          errorMessage: execution.errorMessage,
          repairAttempts: execution.repairAttempts || 0,
          repairSuccessful: execution.repairSuccessful || false,
          inputSize: execution.inputSize,
          outputSize: execution.outputSize,
          outputType: execution.outputType,
          aborted: execution.aborted || false,
          cached: execution.cached || false,
          retryCount: execution.retryCount || 0,
          metadata: metadataInput
        }
      })

      // Update server metrics
      await this.updateServerAggregates(serverId, execution.executionTime, execution.success)

      console.log(`[Metrics] Recorded tool execution: ${toolName} (${execution.success ? 'success' : 'failure'})`)
    } catch (error) {
      console.error('[Metrics] Failed to record tool execution:', error)
    }
  }

  private async updateServerAggregates(
    serverId: string,
    executionTime: number,
    success: boolean
  ): Promise<void> {
    try {
      const server = await this.prisma.mCPServerMetric.findFirst({
        where: { serverId }
      })

      if (server) {
        const newRequestCount = server.totalRequests + 1
        const newAverageLatency = (
          (server.averageLatency * server.totalRequests + executionTime) / 
          newRequestCount
        )

        await this.prisma.mCPServerMetric.updateMany({
          where: { serverId },
          data: {
            totalRequests: newRequestCount,
            averageLatency: newAverageLatency,
            totalExecutionTime: (server.totalExecutionTime || 0) + executionTime,
            totalFailures: success ? server.totalFailures : (server.totalFailures || 0) + 1,
            lastActiveAt: new Date()
          }
        })
      }
    } catch (error) {
      console.error('[Metrics] Failed to update server aggregates:', error)
    }
  }

  public async getGlobalSummaryMetrics(): Promise<GlobalMCPSummary> {
    if (!this.enableMetrics) {
      return {
        totalRequests: 0,
        errorRate: 0,
        avgResponseTime: 0,
        activeUsers: 0,
      };
    }

    try {
      // Query to get sum of totalRequests, totalFailures, and totalExecutionTime from all mCPServerMetric records
      const aggregateMetrics = await this.prisma.mCPServerMetric.aggregate({
        _sum: {
          totalRequests: true,      // Field in mCPServerMetric for total executions
          totalFailures: true,      // Field in mCPServerMetric for failure count
          totalExecutionTime: true, // Field in mCPServerMetric for sum of exec times in ms
        },
      });

      const totalRequests = aggregateMetrics._sum.totalRequests || 0;
      const totalFailedRequests = aggregateMetrics._sum.totalFailures || 0;
      const totalExecutionTimeSum = Number(aggregateMetrics._sum.totalExecutionTime) || 0;

      const errorRate = totalRequests > 0 ? totalFailedRequests / totalRequests : 0;
      const avgResponseTime = totalRequests > 0 ? totalExecutionTimeSum / totalRequests : 0;

      return {
        totalRequests,
        errorRate,
        avgResponseTime,
        activeUsers: 0, // Placeholder: Active user tracking requires further design and implementation
      };
    } catch (error) {
      appLogger.mcp?.error('Failed to calculate global summary metrics:', error as Error);
      return {
        totalRequests: 0,
        errorRate: 0,
        avgResponseTime: 0,
        activeUsers: 0,
      };
    }
  }

  async getServerMetrics(serverId?: string): Promise<unknown> {
    if (!this.enableMetrics) return null;

    try {
      if (serverId) {
        return await this.prisma.mCPServerMetric.findFirst({
          where: { serverId },
          include: {
            toolExecutions: {
              take: 10,
              orderBy: { executedAt: 'desc' },
            },
          },
        });
      } else {
        // Return all server metrics if no specific serverId is provided
        return await this.prisma.mCPServerMetric.findMany({
          include: {
            _count: {
              select: { toolExecutions: true },
            },
          },
          orderBy: { lastActiveAt: 'desc' },
        });
      }
    } catch (error) {
      console.error('[Metrics] Failed to get server metrics:', error);
      return null;
    }
  }

  async getToolExecutionStats(
    serverId?: string,
    toolName?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<ServerMetrics | null> {
    if (!this.enableMetrics) return null;

    try {
      const where: Prisma.MCPToolExecutionWhereInput = {};
      
      if (serverId) where.serverId = serverId;
      if (toolName) where.toolName = toolName;
      if (timeRange) {
        where.executedAt = {
          gte: timeRange.start,
          lte: timeRange.end,
        };
      }

      const executions = await this.prisma.mCPToolExecution.findMany({
        where,
        orderBy: { executedAt: 'desc' },
      });

      const stats = await this.prisma.mCPToolExecution.aggregate({
        where,
        _count: {
          id: true,
        },
        _avg: {
          executionTime: true,
        },
        _sum: {
          repairAttempts: true,
          retryCount: true,
        },
      });
      
      const successCount = executions.filter((e: { success: boolean }) => e.success).length;
      const failureCount = executions.length - successCount;

      return {
        totalExecutions: stats._count.id || 0,
        successCount,
        failureCount,
        successRate: (stats._count.id || 0) > 0 ? successCount / (stats._count.id || 1) : 0,
        averageExecutionTime: stats._avg.executionTime || 0,
        totalRepairAttempts: stats._sum.repairAttempts || 0,
        totalRetryCount: stats._sum.retryCount || 0,
        recentExecutions: executions.slice(0, 10),
      };
    } catch (error) {
      console.error('[Metrics] Failed to get tool execution stats:', error);
      return null;
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.prisma.$disconnect()
    } catch (error) {
      console.error('[Metrics] Failed to cleanup metrics collector:', error)
    }
  }
}

// Global metrics collector instance
export const globalMetricsCollector = new MCPMetricsCollector(true) 