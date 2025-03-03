#!/usr/bin/env node
/**
 * Pooper Analytics MCP Server
 * 
 * Provides analytics tools and resources for the Pooper application
 * This simplified version uses the MCP SDK from langchain-mcp-tools
 */

// Import the necessary packages
import { PrismaClient } from '@prisma/client';
import * as debugModule from 'debug';
import { fileURLToPath } from 'url';
import path from 'path';

// List of profanity words to detect
// This is a simplified list for demonstration purposes
const PROFANITY_LIST = [
  'shit', 'fuck', 'damn', 'ass', 'bitch', 'crap', 'hell',
  'bastard', 'dick', 'piss', 'cunt', 'asshole', 'bollocks'
];

// Configure debug logger
const debug = debugModule.default;
const log = debug('mcp:analytics-server');
const error = debug('mcp:analytics-server:error');

// Enable debug logging when run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  debug.enable('mcp:*');
}

/**
 * Main MCP Server class for Analytics
 */
class AnalyticsMcpServer {
  constructor() {
    log('Initializing Analytics MCP Server');
    
    // Initialize Prisma client
    this.prisma = new PrismaClient();
    
    // Set up message handlers
    this.setupMessageHandlers();
    
    // Set up process signal handlers
    this.setupSignalHandlers();
  }
  
  /**
   * Set up the message handlers for stdio communication with MCP client
   */
  setupMessageHandlers() {
    // Handle messages from stdin
    process.stdin.on('data', async (data) => {
      try {
        // Parse the incoming JSON message
        const message = JSON.parse(data.toString());
        log('Received message: %s', message.method);
        
        // Process the message based on method
        const response = await this.handleMessage(message);
        
        // Send response
        if (response) {
          process.stdout.write(JSON.stringify(response) + '\n');
        }
      } catch (err) {
        error('Error processing message: %s', err.message);
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32000,
            message: `Internal error: ${err.message}`
          }
        }) + '\n');
      }
    });
  }
  
  /**
   * Handle incoming MCP message
   */
  async handleMessage(message) {
    const { id, method, params } = message;
    
    // Common response structure
    const response = {
      jsonrpc: '2.0',
      id
    };
    
    try {
      switch (method) {
        case 'initialize':
          // Handle server initialization
          response.result = {
            name: 'analytics-mcp-server',
            version: '1.0.0',
            capabilities: {
              tools: true,
              resources: true
            }
          };
          break;
          
        case 'list_tools':
          // Return available tools
          response.result = {
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
                name: 'system_overview',
                description: 'Get overview of system statistics',
                inputSchema: {
                  type: 'object',
                  properties: {}
                }
              },
              {
                name: 'profanity_analysis',
                description: 'Analyze cuss word/profanity usage across conversations',
                inputSchema: {
                  type: 'object',
                  properties: {
                    conversationId: {
                      type: 'string',
                      description: 'ID of a specific conversation to analyze (optional)'
                    },
                    userId: {
                      type: 'string',
                      description: 'ID of a specific user to analyze (optional)'
                    },
                    days: {
                      type: 'number',
                      description: 'Number of days to include in the analysis (defaults to 30)'
                    }
                  }
                }
              }
            ]
          };
          break;
          
        case 'call_tool':
          // Handle tool execution
          if (!params.name) {
            throw new Error('Tool name is required');
          }
          
          response.result = await this.executeToolByName(params.name, params.arguments || {});
          break;
          
        case 'list_resources':
          // Return available resources
          response.result = {
            resources: [
              {
                uri: 'analytics://system/overview',
                name: 'System Analytics Overview',
                mimeType: 'application/json',
                description: 'Overview of system analytics'
              }
            ]
          };
          break;
          
        case 'list_resource_templates':
          // Return resource templates
          response.result = {
            resourceTemplates: [
              {
                uriTemplate: 'analytics://user/{userId}/stats',
                name: 'User Statistics',
                mimeType: 'application/json',
                description: 'Analytics for a specific user'
              },
              {
                uriTemplate: 'analytics://conversation/{conversationId}/metrics',
                name: 'Conversation Metrics',
                mimeType: 'application/json',
                description: 'Analytics for a specific conversation'
              }
            ]
          };
          break;
          
        case 'read_resource':
          // Handle resource retrieval
          if (!params.uri) {
            throw new Error('Resource URI is required');
          }
          
          response.result = await this.getResourceContent(params.uri);
          break;
          
        default:
          // Unknown method
          throw new Error(`Unknown method: ${method}`);
      }
      
      return response;
    } catch (err) {
      error('Error handling method %s: %s', method, err.message);
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: err.message
        }
      };
    }
  }
  
  /**
   * Execute a tool by name
   */
  async executeToolByName(name, args) {
    log('Executing tool: %s', name);
    
    switch (name) {
      case 'conversation_summary':
        return this.getConversationSummary(args.conversationId);
        
      case 'user_activity':
        return this.getUserActivity(args.userId, args.days || 7);
        
      case 'system_overview':
        return this.getSystemOverview();
        
      case 'profanity_analysis':
        return this.getProfanityAnalysis(args.conversationId, args.userId, args.days || 30);
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
  
  /**
   * Count profanity words in a string
   * @private
   */
  _countProfanity(text) {
    if (!text) return [];
    
    // Convert to lowercase for case-insensitive matching
    const lowerText = text.toLowerCase();
    
    // Find all occurrences of profanity words
    const occurrences = [];
    
    for (const word of PROFANITY_LIST) {
      let regex = new RegExp(`\\b${word}\\b`, 'gi');
      let match;
      
      while ((match = regex.exec(lowerText)) !== null) {
        occurrences.push({
          word,
          index: match.index,
          context: lowerText.substring(
            Math.max(0, match.index - 20),
            Math.min(lowerText.length, match.index + word.length + 20)
          ).replace(/\n/g, ' ')
        });
      }
    }
    
    return occurrences;
  }
  
  /**
   * Analyze profanity usage across conversations or for a specific user
   */
  async getProfanityAnalysis(conversationId, userId, days = 30) {
    try {
      log('Analyzing profanity usage');
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      // Build query conditions
      const whereConditions = {
        created_at: {
          gte: cutoffDate
        }
      };
      
      if (conversationId) {
        whereConditions.conversation_id = conversationId;
      }
      
      if (userId) {
        whereConditions.user_id = userId;
      }
      
      // Get messages
      const messages = await this.prisma.chatMessage.findMany({
        where: whereConditions,
        include: {
          user: true,
          conversation: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });
      
      log('Analyzing %d messages for profanity', messages.length);
      
      // Analyze profanity in messages
      const results = [];
      const wordCounts = {};
      const userProfanity = {};
      const conversationProfanity = {};
      
      let totalProfanity = 0;
      
      for (const message of messages) {
        const profanityFound = this._countProfanity(message.content);
        
        if (profanityFound.length > 0) {
          // Track totals
          totalProfanity += profanityFound.length;
          
          // Track word-specific counts
          for (const p of profanityFound) {
            wordCounts[p.word] = (wordCounts[p.word] || 0) + 1;
          }
          
          // Track per-user counts
          if (message.user_id) {
            const userName = message.user?.name || message.user?.email || message.user_id;
            
            if (!userProfanity[message.user_id]) {
              userProfanity[message.user_id] = {
                userId: message.user_id,
                name: userName,
                count: 0,
                words: {}
              };
            }
            
            userProfanity[message.user_id].count += profanityFound.length;
            
            for (const p of profanityFound) {
              userProfanity[message.user_id].words[p.word] =
                (userProfanity[message.user_id].words[p.word] || 0) + 1;
            }
          }
          
          // Track per-conversation counts
          if (!conversationProfanity[message.conversation_id]) {
            conversationProfanity[message.conversation_id] = {
              conversationId: message.conversation_id,
              title: message.conversation?.title || 'Untitled',
              count: 0,
              words: {}
            };
          }
          
          conversationProfanity[message.conversation_id].count += profanityFound.length;
          
          for (const p of profanityFound) {
            conversationProfanity[message.conversation_id].words[p.word] =
              (conversationProfanity[message.conversation_id].words[p.word] || 0) + 1;
          }
          
          // Add to detailed results (limited to avoid huge responses)
          if (results.length < 20) {
            results.push({
              messageId: message.id,
              timestamp: message.created_at,
              userId: message.user_id,
              userName: message.user?.name || message.user?.email || 'Unknown',
              conversationId: message.conversation_id,
              conversationTitle: message.conversation?.title || 'Untitled',
              profanityCount: profanityFound.length,
              instances: profanityFound.slice(0, 5) // Limit to first 5 instances
            });
          }
        }
      }
      
      // Calculate percentages and format rankings
      const totalMessages = messages.length;
      const percentWithProfanity = totalMessages > 0
        ? ((results.length / totalMessages) * 100).toFixed(2)
        : 0;
      
      // Sort word counts
      const wordRanking = Object.entries(wordCounts)
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count);
      
      // Sort user profanity
      const userRanking = Object.values(userProfanity)
        .sort((a, b) => b.count - a.count);
      
      // Sort conversation profanity
      const conversationRanking = Object.values(conversationProfanity)
        .sort((a, b) => b.count - a.count);
      
      return {
        content: [
          {
            type: 'text',
            text: {
              period: `Last ${days} days`,
              summary: {
                totalMessagesAnalyzed: totalMessages,
                totalProfanityCount: totalProfanity,
                uniqueWordsUsed: wordRanking.length,
                percentMessagesWithProfanity: `${percentWithProfanity}%`,
                mostUsedProfanity: wordRanking.length > 0 ? wordRanking[0].word : 'None'
              },
              topProfanityRanking: wordRanking.slice(0, 10),
              userRanking: userRanking.slice(0, 5),
              conversationRanking: conversationRanking.slice(0, 5),
              sampleMessages: results.slice(0, 10)
            }
          }
        ]
      };
    } catch (err) {
      error('Error in profanity_analysis: %s', err.message);
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing profanity: ${err.message}`
          }
        ],
        isError: true
      };
    }
  }
  
  /**
   * Get resource content by URI
   */
  async getResourceContent(uri) {
    log('Getting resource: %s', uri);
    
    // Handle system overview resource
    if (uri === 'analytics://system/overview') {
      const overview = await this.getSystemOverview();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(overview.content[0].text, null, 2)
          }
        ]
      };
    }
    
    // Handle user stats resource
    const userMatch = uri.match(/^analytics:\/\/user\/([^/]+)\/stats$/);
    if (userMatch) {
      const userId = decodeURIComponent(userMatch[1]);
      const userStats = await this.getUserActivity({ userId });
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(userStats.content[0].text, null, 2)
          }
        ]
      };
    }
    
    // Handle conversation metrics resource
    const conversationMatch = uri.match(/^analytics:\/\/conversation\/([^/]+)\/metrics$/);
    if (conversationMatch) {
      const conversationId = decodeURIComponent(conversationMatch[1]);
      const metrics = await this.getConversationSummary(conversationId);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(metrics.content[0].text, null, 2)
          }
        ]
      };
    }
    
    throw new Error(`Unknown resource URI: ${uri}`);
  }
  
  /**
   * Get conversation summary
   */
  async getConversationSummary(conversationId) {
    try {
      // Validate and retrieve conversation
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: true,
          stats: true,
          user: true
        }
      });
      
      if (!conversation) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }
      
      // Calculate metrics
      const messageCount = conversation.messages.length;
      const userMessages = conversation.messages.filter(m => m.role === 'user').length;
      const assistantMessages = conversation.messages.filter(m => m.role === 'assistant').length;
      
      // Word counts
      const totalWords = conversation.messages.reduce((sum, message) => {
        return sum + (message.content.match(/\S+/g) || []).length;
      }, 0);
      
      const averageWordsPerMessage = messageCount > 0 ? totalWords / messageCount : 0;
      
      // Count profanity
      let totalProfanityCount = 0;
      let profanityByType = {};
      let messagesWithProfanity = 0;
      
      for (const message of conversation.messages) {
        const profanityFound = this._countProfanity(message.content);
        
        if (profanityFound.length > 0) {
          messagesWithProfanity++;
          totalProfanityCount += profanityFound.length;
          
          // Count by word type
          for (const instance of profanityFound) {
            profanityByType[instance.word] = (profanityByType[instance.word] || 0) + 1;
          }
        }
      }
      
      // Format profanity data
      const profanityRanking = Object.entries(profanityByType)
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count);
      
      // Format result
      const result = {
        conversationId,
        title: conversation.title || 'Untitled',
        created: conversation.created_at,
        updated: conversation.updated_at,
        messageCount,
        userMessages,
        assistantMessages,
        totalWords,
        averageWordsPerMessage: Math.round(averageWordsPerMessage),
        isArchived: conversation.is_archived,
        profanity: {
          totalCussWords: totalProfanityCount,
          messagesWithProfanity,
          percentWithProfanity: messageCount > 0
            ? ((messagesWithProfanity / messageCount) * 100).toFixed(2)
            : '0.00',
          topCussWords: profanityRanking.slice(0, 5)
        },
        user: conversation.user ? {
          id: conversation.user.id,
          name: conversation.user.name,
          email: conversation.user.email
        } : null
      };
      
      return {
        content: [
          {
            type: 'text',
            text: result
          }
        ]
      };
    } catch (err) {
      error('Error in conversation_summary: %s', err.message);
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing conversation: ${err.message}`
          }
        ],
        isError: true
      };
    }
  }
  
  /**
   * Get user activity statistics
   */
  async getUserActivity(userId, days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      let userQuery = {};
      
      if (userId) {
        // Query for specific user
        userQuery = { where: { id: userId } };
      }
      
      // Get users with stats
      const users = await this.prisma.user.findMany({
        ...userQuery,
        take: 5,
        include: {
          usage_stats: true,
          conversations: {
            take: 3,
            orderBy: {
              updated_at: 'desc'
            }
          },
          messages: {
            take: 5,
            orderBy: {
              created_at: 'desc'
            }
          }
        }
      });
      
      if (users.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: userId ? `User not found: ${userId}` : 'No users found'
            }
          ],
          isError: false
        };
      }
      
      // Format results
      const results = users.map(user => ({
        userId: user.id,
        name: user.name || 'Unknown',
        email: user.email,
        created: user.created_at,
        stats: {
          messageCount: user.messages.length,
          conversationCount: user.conversations.length,
          totalConversations: user.usage_stats?.total_conversations || 0,
          totalMessages: user.usage_stats?.total_messages || 0,
          lastActive: user.usage_stats?.last_active || null
        },
        recentActivity: {
          conversations: user.conversations.map(c => ({
            id: c.id,
            title: c.title || 'Untitled',
            lastUpdated: c.updated_at
          }))
        }
      }));
      
      return {
        content: [
          {
            type: 'text',
            text: {
              period: `Last ${days} days`,
              userCount: results.length,
              users: results
            }
          }
        ]
      };
    } catch (err) {
      error('Error in user_activity: %s', err.message);
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing user activity: ${err.message}`
          }
        ],
        isError: true
      };
    }
  }
  
  /**
   * Get system overview statistics
   */
  async getSystemOverview() {
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
      
      // Get profanity stats
      // Get 100 most recent messages to analyze for profanity trends
      const recentMessages = await this.prisma.chatMessage.findMany({
        take: 100,
        orderBy: {
          created_at: 'desc'
        }
      });
      
      let profanityStats = {
        totalCussWords: 0,
        messagesWithProfanity: 0,
        wordCounts: {}
      };
      
      // Analyze messages for profanity
      for (const message of recentMessages) {
        const profanityFound = this._countProfanity(message.content);
        
        if (profanityFound.length > 0) {
          profanityStats.messagesWithProfanity++;
          profanityStats.totalCussWords += profanityFound.length;
          
          // Count occurrences by word
          for (const instance of profanityFound) {
            profanityStats.wordCounts[instance.word] =
              (profanityStats.wordCounts[instance.word] || 0) + 1;
          }
        }
      }
      
      // Format profanity ranking
      const profanityRanking = Object.entries(profanityStats.wordCounts)
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count);
      
      // Calculate percentage
      const percentWithProfanity = recentMessages.length > 0
        ? ((profanityStats.messagesWithProfanity / recentMessages.length) * 100).toFixed(2)
        : '0.00';
      
      // Format overview data
      const overviewData = {
        timestamp: new Date().toISOString(),
        metrics: {
          totalUsers: userCount,
          totalConversations: conversationCount,
          totalMessages: messageCount,
          activeConversations: await this.prisma.conversation.count({
            where: { is_archived: false }
          }),
          archivedConversations: await this.prisma.conversation.count({
            where: { is_archived: true }
          }),
        },
        last24Hours: {
          newUsers,
          newConversations,
          newMessages,
        },
        profanityStats: {
          recentSample: {
            messagesAnalyzed: recentMessages.length,
            totalCussWords: profanityStats.totalCussWords,
            messagesWithProfanity: profanityStats.messagesWithProfanity,
            percentMessagesWithProfanity: `${percentWithProfanity}%`,
            topCussWords: profanityRanking.slice(0, 5)
          }
        }
      };
      
      return {
        content: [
          {
            type: 'text',
            text: overviewData
          }
        ]
      };
    } catch (err) {
      error('Error in system_overview: %s', err.message);
      return {
        content: [
          {
            type: 'text',
            text: `Error generating system overview: ${err.message}`
          }
        ],
        isError: true
      };
    }
  }
  
  /**
   * Set up process signal handlers for graceful shutdown
   */
  setupSignalHandlers() {
    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });
    
    // Handle SIGTERM
    process.on('SIGTERM', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }
  
  /**
   * Clean up resources when shutting down
   */
  async cleanup() {
    log('Cleaning up resources...');
    try {
      await this.prisma.$disconnect();
      log('Prisma client disconnected');
    } catch (err) {
      error('Error during cleanup: %s', err.message);
    }
  }
  
  /**
   * Start the server
   */
  start() {
    log('Analytics MCP server starting...');
    process.stderr.write('Analytics MCP server running on stdio\n');
  }
}

// Create and start the server when this file is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = new AnalyticsMcpServer();
  server.start();
}

export { AnalyticsMcpServer };