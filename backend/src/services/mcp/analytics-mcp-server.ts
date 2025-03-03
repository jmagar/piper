#!/usr/bin/env node
// MCP Server for analytics
import { Server } from '@h1deya/langchain-mcp-tools/node_modules/@modelcontextprotocol/sdk';
import { StdioServerTransport } from '@h1deya/langchain-mcp-tools/node_modules/@modelcontextprotocol/sdk';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
  type ServerRequest,
} from '@h1deya/langchain-mcp-tools/node_modules/@modelcontextprotocol/sdk';
import { PrismaClient } from '@prisma/client';

/**
 * Analytics MCP Server
 * 
 * Provides tools and resources for analyzing chat conversations, tool usage,
 * and user interactions within the Pooper application.
 */
class AnalyticsMcpServer {
  private server: Server;
  private prisma: PrismaClient;

  constructor() {
    // Initialize MCP server
    this.server = new Server(
      {
        name: 'analytics-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize Prisma client for database access
    this.prisma = new PrismaClient();

    // Set up handlers
    this.setupToolHandlers();
    this.setupResourceHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Analytics Error]', error);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Set up tool handlers for the analytics server
   */
  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'conversation_summary',
          description: 'Generate a summary of statistics for a specific conversation',
          inputSchema: {
            type: 'object',
            properties: {
              conversationId: {
                type: 'string',
                description: 'ID of the conversation to analyze'
              }
            },
            required: ['conversationId']
          }
        },
        {
          name: 'user_activity',
          description: 'Get user activity statistics',
          inputSchema: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'ID of the user to analyze (optional)'
              },
              days: {
                type: 'number',
                description: 'Number of days to include in the analysis (defaults to 7)'
              }
            }
          }
        },
        {
          name: 'tool_usage_stats',
          description: 'Get statistics about MCP tool usage',
          inputSchema: {
            type: 'object',
            properties: {
              toolName: {
                type: 'string',
                description: 'Name of the specific tool to analyze (optional)'
              },
              days: {
                type: 'number',
                description: 'Number of days to include in the analysis (defaults to 30)'
              }
            }
          }
        }
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      // Extract tool name and validate
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case 'conversation_summary':
            return await this.handleConversationSummary(args.conversationId);
          
          case 'user_activity':
            return await this.handleUserActivity(args.userId, args.days || 7);
          
          case 'tool_usage_stats':
            return await this.handleToolUsageStats(args.toolName, args.days || 30);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        console.error(`Error executing tool ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    });
  }

  /**
   * Set up resource handlers for the analytics server
   */
  private setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'analytics://system/overview',
          name: 'System Analytics Overview',
          mimeType: 'application/json',
          description: 'Overview of system analytics including active users, conversations, and tool usage'
        }
      ],
    }));

    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
      resourceTemplates: [
        {
          uriTemplate: 'analytics://user/{userId}/stats',
          name: 'User Statistics',
          mimeType: 'application/json',
          description: 'Statistics for a specific user'
        },
        {
          uriTemplate: 'analytics://conversation/{conversationId}/metrics',
          name: 'Conversation Metrics',
          mimeType: 'application/json',
          description: 'Metrics for a specific conversation'
        }
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      try {
        // Handle static resource
        if (uri === 'analytics://system/overview') {
          return await this.handleSystemOverview();
        }
        
        // Handle dynamic resources with templates
        const userMatch = uri.match(/^analytics:\/\/user\/([^/]+)\/stats$/);
        if (userMatch) {
          const userId = decodeURIComponent(userMatch[1]);
          return await this.handleUserStats(userId);
        }
        
        const conversationMatch = uri.match(/^analytics:\/\/conversation\/([^/]+)\/metrics$/);
        if (conversationMatch) {
          const conversationId = decodeURIComponent(conversationMatch[1]);
          return await this.handleConversationMetrics(conversationId);
        }
        
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Invalid URI format: ${uri}`
        );
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        console.error(`Error reading resource ${uri}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Error reading resource: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  /**
   * Handle conversation summary tool
   */
  private async handleConversationSummary(conversationId: string) {
    try {
      // Validate conversation exists
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: true,
          stats: true,
        }
      });
      
      if (!conversation) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Conversation with ID ${conversationId} not found`
        );
      }
      
      // Get summary data
      const messageCount = conversation.messages.length;
      const userMessages = conversation.messages.filter(m => m.role === 'user').length;
      const assistantMessages = conversation.messages.filter(m => m.role === 'assistant').length;
      
      // Get word counts
      const totalWords = conversation.messages.reduce((sum, message) => {
        return sum + (message.content.match(/\S+/g) || []).length;
      }, 0);
      
      const averageWordsPerMessage = totalWords / messageCount;
      
      // Format and return response
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              conversationId,
              title: conversation.title || 'Untitled conversation',
              createdAt: conversation.created_at,
              lastUpdated: conversation.updated_at,
              messageCount,
              userMessages,
              assistantMessages,
              totalWords,
              averageWordsPerMessage: Math.round(averageWordsPerMessage),
              toolUsageCount: conversation.stats?.tool_usage_count || 0,
              isArchived: conversation.is_archived,
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      console.error('Error in conversation_summary:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing conversation: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Handle user activity tool
   */
  private async handleUserActivity(userId?: string, days: number = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      let userQuery = {};
      
      if (userId) {
        // Query for specific user
        userQuery = { where: { user_id: userId } };
      }
      
      // Get message counts for the time period
      const messageCounts = await this.prisma.chatMessage.groupBy({
        by: ['user_id'],
        where: {
          created_at: {
            gte: cutoffDate
          },
          ...userQuery
        },
        _count: {
          id: true
        }
      });
      
      // Get conversation counts
      const conversationCounts = await this.prisma.conversation.groupBy({
        by: ['user_id'],
        where: {
          created_at: {
            gte: cutoffDate
          },
          ...userQuery
        },
        _count: {
          id: true
        }
      });
      
      // Combine the results
      const results = await Promise.all(
        Array.from(new Set([
          ...messageCounts.map(m => m.user_id),
          ...conversationCounts.map(c => c.user_id)
        ]))
        .filter(id => id) // Filter out null user_ids
        .map(async (id) => {
          const user = await this.prisma.user.findUnique({
            where: { id: id as string },
            select: { id: true, name: true, email: true }
          });
          
          const messageCount = messageCounts.find(m => m.user_id === id)?._count?.id || 0;
          const conversationCount = conversationCounts.find(c => c.user_id === id)?._count?.id || 0;
          
          return {
            userId: id,
            userName: user?.name || 'Unknown',
            email: user?.email || 'unknown@example.com',
            messageCount,
            conversationCount,
            averageMessagesPerConversation: conversationCount > 0 
              ? Math.round(messageCount / conversationCount) 
              : 0
          };
        })
      );
      
      // Format and return response
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              period: `Last ${days} days`,
              userCount: results.length,
              users: results
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error('Error in user_activity:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing user activity: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Handle tool usage statistics tool
   */
  private async handleToolUsageStats(toolName?: string, days: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      // We'll analyze message metadata for tool usage
      // In a real implementation, you might have a dedicated tool_usage table
      const messages = await this.prisma.chatMessage.findMany({
        where: {
          created_at: {
            gte: cutoffDate
          },
          metadata: {
            path: ['tool_usage'],
            not: null
          }
        },
        select: {
          id: true,
          metadata: true,
          created_at: true
        }
      });
      
      // Extract tool usage from metadata
      const toolUsage = messages.flatMap(message => {
        const metadata = message.metadata as any;
        if (!metadata?.tool_usage || !Array.isArray(metadata.tool_usage)) {
          return [];
        }
        
        return metadata.tool_usage.map((usage: any) => ({
          messageId: message.id,
          timestamp: message.created_at,
          toolName: usage.name,
          success: usage.success || false,
          executionTime: usage.execution_time || 0
        }));
      });
      
      // Filter by tool name if provided
      const filteredUsage = toolName 
        ? toolUsage.filter(u => u.toolName === toolName)
        : toolUsage;
      
      // Calculate statistics
      const toolStats = new Map<string, {
        count: number;
        successCount: number;
        failureCount: number;
        totalExecutionTime: number;
      }>();
      
      for (const usage of filteredUsage) {
        const stats = toolStats.get(usage.toolName) || {
          count: 0,
          successCount: 0,
          failureCount: 0,
          totalExecutionTime: 0
        };
        
        stats.count++;
        if (usage.success) {
          stats.successCount++;
        } else {
          stats.failureCount++;
        }
        stats.totalExecutionTime += usage.executionTime;
        
        toolStats.set(usage.toolName, stats);
      }
      
      // Format results
      const results = Array.from(toolStats.entries()).map(([tool, stats]) => ({
        toolName: tool,
        totalUsage: stats.count,
        successRate: stats.count > 0 ? (stats.successCount / stats.count * 100).toFixed(2) + '%' : '0%',
        averageExecutionTime: stats.count > 0 ? (stats.totalExecutionTime / stats.count).toFixed(2) + 'ms' : '0ms',
        successCount: stats.successCount,
        failureCount: stats.failureCount
      }));
      
      // Format and return response
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              period: `Last ${days} days`,
              toolCount: results.length,
              totalUsage: filteredUsage.length,
              tools: results
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error('Error in tool_usage_stats:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing tool usage: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Handle system overview resource
   */
  private async handleSystemOverview() {
    try {
      // Get current counts
      const userCount = await this.prisma.user.count();
      const conversationCount = await this.prisma.conversation.count();
      const messageCount = await this.prisma.chatMessage.count();
      
      // Get counts for last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const newUsers = await this.prisma.user.count({
        where: {
          created_at: {
            gte: oneDayAgo
          }
        }
      });
      
      const newConversations = await this.prisma.conversation.count({
        where: {
          created_at: {
            gte: oneDayAgo
          }
        }
      });
      
      const newMessages = await this.prisma.chatMessage.count({
        where: {
          created_at: {
            gte: oneDayAgo
          }
        }
      });
      
      // Format overview data
      const overviewData = {
        timestamp: new Date().toISOString(),
        metrics: {
          totalUsers: userCount,
          totalConversations: conversationCount,
          totalMessages: messageCount,
          activeConversations: await this.prisma.conversation.count({
            where: {
              is_archived: false
            }
          }),
          archivedConversations: await this.prisma.conversation.count({
            where: {
              is_archived: true
            }
          }),
        },
        last24Hours: {
          newUsers,
          newConversations,
          newMessages,
        }
      };
      
      return {
        contents: [
          {
            uri: 'analytics://system/overview',
            mimeType: 'application/json',
            text: JSON.stringify(overviewData, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error('Error generating system overview:', error);
      throw new McpError(
        ErrorCode.InternalError,
        `Error generating system overview: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Handle user stats resource
   */
  private async handleUserStats(userId: string) {
    try {
      // Get user data
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          usage_stats: true,
          conversations: {
            take: 5,
            orderBy: {
              updated_at: 'desc'
            }
          },
          starred_messages: {
            take: 5,
            include: {
              message: true
            },
            orderBy: {
              created_at: 'desc'
            }
          }
        }
      });
      
      if (!user) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `User with ID ${userId} not found`
        );
      }
      
      // Format user stats
      const userStats = {
        userId: user.id,
        name: user.name || 'Unnamed User',
        email: user.email,
        createdAt: user.created_at,
        stats: user.usage_stats || {
          total_conversations: 0,
          total_messages: 0,
          total_starred: 0,
          average_response_length: 0,
          last_active: new Date()
        },
        recentConversations: user.conversations.map(conv => ({
          id: conv.id,
          title: conv.title || 'Untitled',
          lastUpdated: conv.updated_at,
          isArchived: conv.is_archived
        })),
        recentStarredMessages: user.starred_messages.map(star => ({
          id: star.id,
          messageId: star.message_id,
          content: star.message.content.substring(0, 100) + (star.message.content.length > 100 ? '...' : ''),
          starredAt: star.created_at,
          note: star.note || null
        }))
      };
      
      return {
        contents: [
          {
            uri: `analytics://user/${userId}/stats`,
            mimeType: 'application/json',
            text: JSON.stringify(userStats, null, 2)
          }
        ]
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      console.error(`Error generating user stats for ${userId}:`, error);
      throw new McpError(
        ErrorCode.InternalError,
        `Error generating user stats: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Handle conversation metrics resource
   */
  private async handleConversationMetrics(conversationId: string) {
    try {
      // Get conversation data
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: {
              created_at: 'asc'
            }
          },
          stats: true,
          user: true
        }
      });
      
      if (!conversation) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Conversation with ID ${conversationId} not found`
        );
      }
      
      // Calculate additional metrics
      const userMessages = conversation.messages.filter(m => m.role === 'user');
      const assistantMessages = conversation.messages.filter(m => m.role === 'assistant');
      
      // Calculate response times (time between user message and next assistant message)
      const responseTimes: number[] = [];
      
      for (let i = 0; i < conversation.messages.length - 1; i++) {
        const currentMsg = conversation.messages[i];
        const nextMsg = conversation.messages[i + 1];
        
        if (currentMsg.role === 'user' && nextMsg.role === 'assistant') {
          const responseTime = nextMsg.created_at.getTime() - currentMsg.created_at.getTime();
          responseTimes.push(responseTime);
        }
      }
      
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;
      
      // Calculate message lengths
      const userMessageLengths = userMessages.map(m => m.content.length);
      const assistantMessageLengths = assistantMessages.map(m => m.content.length);
      
      const avgUserMessageLength = userMessageLengths.length > 0
        ? userMessageLengths.reduce((sum, len) => sum + len, 0) / userMessageLengths.length
        : 0;
        
      const avgAssistantMessageLength = assistantMessageLengths.length > 0
        ? assistantMessageLengths.reduce((sum, len) => sum + len, 0) / assistantMessageLengths.length
        : 0;
      
      // Format metrics
      const metrics = {
        conversationId: conversation.id,
        title: conversation.title || 'Untitled',
        createdAt: conversation.created_at,
        lastUpdated: conversation.updated_at,
        user: conversation.user ? {
          id: conversation.user.id,
          name: conversation.user.name || 'Unnamed User',
          email: conversation.user.email
        } : null,
        messageCount: conversation.messages.length,
        userMessageCount: userMessages.length,
        assistantMessageCount: assistantMessages.length,
        metrics: {
          averageResponseTime: `${(avgResponseTime / 1000).toFixed(2)} seconds`,
          averageUserMessageLength: Math.round(avgUserMessageLength),
          averageAssistantMessageLength: Math.round(avgAssistantMessageLength),
          conversationDuration: `${((conversation.updated_at.getTime() - conversation.created_at.getTime()) / 60000).toFixed(2)} minutes`,
          toolUsageCount: conversation.stats?.tool_usage_count || 0
        },
        dbStats: conversation.stats || null
      };
      
      return {
        contents: [
          {
            uri: `analytics://conversation/${conversationId}/metrics`,
            mimeType: 'application/json',
            text: JSON.stringify(metrics, null, 2)
          }
        ]
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      console.error(`Error generating conversation metrics for ${conversationId}:`, error);
      throw new McpError(
        ErrorCode.InternalError,
        `Error generating conversation metrics: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Clean up resources when shutting down
   */
  private async cleanup() {
    console.log('Cleaning up resources...');
    try {
      await this.prisma.$disconnect();
      console.log('Prisma client disconnected');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Run the MCP server
   */
  async run() {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('Analytics MCP server running on stdio');
    } catch (error) {
      console.error('Error starting Analytics MCP server:', error);
      process.exit(1);
    }
  }
}

// Create and run the server
const server = new AnalyticsMcpServer();
server.run().catch(console.error);