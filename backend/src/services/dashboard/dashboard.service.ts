import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';

// Create a Prisma client instance
const prisma = new PrismaClient();

// Type definitions for SQL query results
interface CountResult {
  count: string;
}

interface ConversationStats {
  total: string;
  today: string;
  active: string;
}

interface ServerStatus {
  online: string;
  offline: string;
  error: string;
}

interface TypeCount {
  type: string;
  count: string;
}

interface SuccessRateResult {
  success: string;
  total: string;
}

export class DashboardService {
  /**
   * Get dashboard summary data
   * @param userId Optional user ID to filter data by user
   * @returns Dashboard summary data
   */
  static async getDashboardSummary(userId?: string) {
    try {
      // Get recent activities
      const recentActivities = await prisma.$queryRaw`
        SELECT * FROM "activities"
        ${userId ? `WHERE "user_id" = ${userId}` : ''}
        ORDER BY "timestamp" DESC
        LIMIT 5
      `;

      // Get unread alerts count
      const unreadAlertsCount = await prisma.$queryRaw<CountResult[]>`
        SELECT COUNT(*) FROM "alerts"
        WHERE "read" = false
        ${userId ? `AND "user_id" = ${userId}` : ''}
      `;

      // Get document count
      const documentCount = await prisma.$queryRaw<CountResult[]>`
        SELECT COUNT(*) FROM "documents"
        ${userId ? `WHERE "user_id" = ${userId}` : ''}
      `;

      // Get prompt count
      const promptCount = await prisma.$queryRaw<CountResult[]>`
        SELECT COUNT(*) FROM "prompt_templates"
        ${userId ? `WHERE "user_id" = ${userId}` : ''}
      `;

      // Get conversation stats
      const conversationStats = await prisma.$queryRaw<ConversationStats[]>`
        SELECT
          COUNT(*) as "total",
          COUNT(*) FILTER (WHERE "created_at" >= CURRENT_DATE) as "today",
          COUNT(*) FILTER (WHERE "is_archived" = false) as "active"
        FROM "conversations"
        ${userId ? `WHERE "user_id" = ${userId}` : ''}
      `;

      // Get server status
      const serverStatus = await prisma.$queryRaw<ServerStatus[]>`
        SELECT
          COUNT(*) FILTER (WHERE "status" = 'active') as "online",
          COUNT(*) FILTER (WHERE "status" = 'inactive') as "offline",
          COUNT(*) FILTER (WHERE "status" = 'maintenance') as "error"
        FROM "mcp_servers"
      `;

      return {
        recentActivities,
        unreadAlerts: parseInt(unreadAlertsCount[0].count, 10),
        documentCount: parseInt(documentCount[0].count, 10),
        promptCount: parseInt(promptCount[0].count, 10),
        conversations: {
          total: parseInt(conversationStats[0].total, 10),
          today: parseInt(conversationStats[0].today, 10),
          active: parseInt(conversationStats[0].active, 10),
        },
        serverStatus: {
          online: parseInt(serverStatus[0].online, 10),
          offline: parseInt(serverStatus[0].offline, 10),
          error: parseInt(serverStatus[0].error, 10),
        },
      };
    } catch (error) {
      logger.error('Error getting dashboard summary:', error);
      throw error;
    }
  }

  /**
   * Get document statistics
   * @param options Options for filtering and pagination
   * @returns Document statistics
   */
  static async getDocumentStats(options: {
    userId?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    try {
      const { userId, limit = 10, offset = 0 } = options;

      // Get documents
      const documents = await prisma.$queryRaw`
        SELECT * FROM "documents"
        ${userId ? `WHERE "user_id" = ${userId}` : ''}
        ORDER BY "access_count" DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      // Get document count
      const count = await prisma.$queryRaw<CountResult[]>`
        SELECT COUNT(*) FROM "documents"
        ${userId ? `WHERE "user_id" = ${userId}` : ''}
      `;

      // Get recently accessed documents
      const recentlyAccessed = await prisma.$queryRaw`
        SELECT d.* FROM "documents" d
        JOIN "document_accesses" da ON d."id" = da."document_id"
        ${userId ? `WHERE d."user_id" = ${userId}` : ''}
        ORDER BY da."accessed_at" DESC
        LIMIT 5
      `;

      // Get type breakdown
      const typeBreakdown = await prisma.$queryRaw<TypeCount[]>`
        SELECT "type", COUNT(*) FROM "documents"
        ${userId ? `WHERE "user_id" = ${userId}` : ''}
        GROUP BY "type"
      `;

      // Format type breakdown
      const formattedTypeBreakdown = typeBreakdown.reduce((acc: Record<string, number>, curr: TypeCount) => {
        acc[curr.type] = parseInt(curr.count, 10);
        return acc;
      }, {});

      return {
        documents,
        count: parseInt(count[0].count, 10),
        recentlyAccessed,
        typeBreakdown: formattedTypeBreakdown,
      };
    } catch (error) {
      logger.error('Error getting document statistics:', error);
      throw error;
    }
  }

  /**
   * Get MCP server statistics
   * @returns MCP server statistics
   */
  static async getMcpServerStats() {
    try {
      // Get servers with status
      const servers = await prisma.$queryRaw`
        SELECT 
          ms.*,
          (
            CASE 
              WHEN ms."status" = 'active' THEN 'online'
              WHEN ms."status" = 'inactive' THEN 'offline'
              ELSE 'error'
            END
          ) as status,
          (SELECT COUNT(*) FROM "mcp_tools" mt WHERE mt."server_id" = ms."id") as "toolCount",
          (SELECT COUNT(*) FROM "socket_events" se WHERE se."event_type" = 'tool:execute' AND se."payload"->>'serverId' = ms."id") as "usageCount"
        FROM "mcp_servers" ms
      `;

      // Get total tools
      const totalTools = await prisma.$queryRaw<CountResult[]>`
        SELECT COUNT(*) FROM "mcp_tools"
      `;

      // Get total requests
      const totalRequests = await prisma.$queryRaw<CountResult[]>`
        SELECT COUNT(*) FROM "socket_events"
        WHERE "event_type" = 'tool:execute'
      `;

      // Get success rate
      const successRate = await prisma.$queryRaw<SuccessRateResult[]>`
        SELECT
          COUNT(*) FILTER (WHERE "payload"->>'status' = 'success') as "success",
          COUNT(*) as "total"
        FROM "socket_events"
        WHERE "event_type" = 'tool:execute'
      `;

      // Get top tools
      const topTools = await prisma.$queryRaw`
        SELECT
          mt."id",
          mt."name",
          mt."server_id" as "serverId",
          COUNT(se."id") as "usageCount",
          MAX(se."created_at") as "lastUsed"
        FROM "mcp_tools" mt
        LEFT JOIN "socket_events" se ON se."event_type" = 'tool:execute' AND se."payload"->>'toolId' = mt."id"
        GROUP BY mt."id", mt."name", mt."server_id"
        ORDER BY "usageCount" DESC
        LIMIT 5
      `;

      return {
        servers,
        totalTools: parseInt(totalTools[0].count, 10),
        totalRequests: parseInt(totalRequests[0].count, 10),
        successRate: parseInt(successRate[0].total, 10) > 0 
          ? parseInt(successRate[0].success, 10) / parseInt(successRate[0].total, 10) 
          : 0,
        topTools,
      };
    } catch (error) {
      logger.error('Error getting MCP server statistics:', error);
      throw error;
    }
  }

  /**
   * Get alerts
   * @param options Options for filtering and pagination
   * @returns Alerts
   */
  static async getAlerts(options: {
    userId?: string;
    read?: boolean;
    type?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    try {
      const { userId, read, type, limit = 10, offset = 0 } = options;

      // Build where conditions
      const whereConditions = [];

      if (userId) {
        whereConditions.push(`"user_id" = '${userId}'`);
      }

      if (read !== undefined) {
        whereConditions.push(`"read" = ${read}`);
      }

      if (type) {
        whereConditions.push(`"type" = '${type}'`);
      }

      // Build WHERE clause
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Get alerts
      const alerts = await prisma.$queryRawUnsafe(`
        SELECT * FROM "alerts"
        ${whereClause}
        ORDER BY "timestamp" DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      // Get count
      const count = await prisma.$queryRawUnsafe<CountResult[]>(`
        SELECT COUNT(*) FROM "alerts"
        ${whereClause}
      `);

      // Get unread count
      const unreadCount = await prisma.$queryRawUnsafe<CountResult[]>(`
        SELECT COUNT(*) FROM "alerts"
        WHERE "read" = false
        ${userId ? `AND "user_id" = '${userId}'` : ''}
      `);

      return {
        alerts,
        count: parseInt(count[0].count, 10),
        unreadCount: parseInt(unreadCount[0].count, 10),
      };
    } catch (error) {
      logger.error('Error getting alerts:', error);
      throw error;
    }
  }

  /**
   * Mark an alert as read
   * @param alertId The ID of the alert
   * @returns The updated alert
   */
  static async markAlertAsRead(alertId: string) {
    try {
      const alert = await prisma.$queryRaw`
        UPDATE "alerts"
        SET "read" = true
        WHERE "id" = ${alertId}
        RETURNING *
      `;

      if (!alert || (alert as any[]).length === 0) {
        throw new Error(`Alert with ID ${alertId} not found`);
      }

      return (alert as any[])[0];
    } catch (error) {
      logger.error(`Error marking alert ${alertId} as read:`, error);
      throw error;
    }
  }

  /**
   * Delete an alert
   * @param alertId The ID of the alert
   */
  static async deleteAlert(alertId: string) {
    try {
      const alert = await prisma.$queryRaw`
        DELETE FROM "alerts"
        WHERE "id" = ${alertId}
        RETURNING *
      `;

      if (!alert || (alert as any[]).length === 0) {
        throw new Error(`Alert with ID ${alertId} not found`);
      }

      return (alert as any[])[0];
    } catch (error) {
      logger.error(`Error deleting alert ${alertId}:`, error);
      throw error;
    }
  }

  /**
   * Get user activity log
   * @param options Options for filtering and pagination
   * @returns Activity log
   */
  static async getActivityLog(options: {
    userId?: string;
    type?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}) {
    try {
      const { userId, type, startDate, endDate, limit = 10, offset = 0 } = options;

      // Build where conditions
      const whereConditions = [];

      if (userId) {
        whereConditions.push(`"user_id" = '${userId}'`);
      }

      if (type) {
        whereConditions.push(`"type" = '${type}'`);
      }

      if (startDate) {
        whereConditions.push(`"timestamp" >= '${startDate.toISOString()}'`);
      }

      if (endDate) {
        whereConditions.push(`"timestamp" <= '${endDate.toISOString()}'`);
      }

      // Build WHERE clause
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Get activities
      const activities = await prisma.$queryRawUnsafe(`
        SELECT * FROM "activities"
        ${whereClause}
        ORDER BY "timestamp" DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      // Get count
      const count = await prisma.$queryRawUnsafe<CountResult[]>(`
        SELECT COUNT(*) FROM "activities"
        ${whereClause}
      `);

      return {
        activities,
        count: parseInt(count[0].count, 10),
      };
    } catch (error) {
      logger.error('Error getting activity log:', error);
      throw error;
    }
  }
} 