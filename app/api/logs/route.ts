import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
// Using simple console logging instead of complex logger system
const appLogger = {
  info: (message: string, metadata?: Record<string, unknown>) => console.log(`[INFO] ${message}`, metadata),
  error: (message: string, error?: Error, metadata?: Record<string, unknown>) => console.error(`[ERROR] ${message}`, error, metadata),
  debug: (message: string, metadata?: Record<string, unknown>) => console.log(`[DEBUG] ${message}`, metadata),
};
import { getCurrentCorrelationId } from '@/lib/logger/correlation'

interface LogEntry {
  id: string
  timestamp: string
  level: 'error' | 'warn' | 'info' | 'debug'
  source: 'HTTP' | 'MCP' | 'AI_SDK' | 'APPLICATION' | 'SYSTEM'
  message: string
  correlationId?: string
  userId?: string
  requestId?: string
  operation?: string
  duration?: number
  error?: {
    name: string
    message: string
    stack?: string
  }
  metadata?: Record<string, unknown>
  tokenUsage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  cost?: {
    inputCost: number
    outputCost: number
    totalCost: number
    currency: string
  }
}

interface LogFilters {
  level?: string
  source?: string
  operation?: string
  correlationId?: string
  userId?: string
  startTime?: string
  endTime?: string
  search?: string
  hasError?: boolean
}

export async function GET(request: NextRequest) {
  const correlationId = getCurrentCorrelationId()
  
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse filters
    const filters: LogFilters = {
      level: searchParams.get('level') || undefined,
      source: searchParams.get('source') || undefined,
      operation: searchParams.get('operation') || undefined,
      correlationId: searchParams.get('correlationId') || undefined,
      userId: searchParams.get('userId') || undefined,
      startTime: searchParams.get('startTime') || undefined,
      endTime: searchParams.get('endTime') || undefined,
      search: searchParams.get('search') || undefined,
      hasError: searchParams.get('hasError') === 'true' || undefined
    }
    
    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000) // Max 1000 per page
    
    appLogger.debug('Logs API request received', {
      correlationId,
      filters,
      page,
      limit
    })
    
    // Read and parse log files
    const logs = await readLogFiles(filters)
    
    // Calculate aggregations
    const aggregations = calculateAggregations(logs)
    
    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedLogs = logs.slice(startIndex, endIndex)
    
    const response = {
      logs: paginatedLogs,
      pagination: {
        page,
        limit,
        total: logs.length,
        hasNext: endIndex < logs.length,
        hasPrev: page > 1
      },
      aggregations
    }
    
    appLogger.debug('Logs API response prepared', {
      correlationId,
      totalLogs: logs.length,
      returnedLogs: paginatedLogs.length,
      page,
      limit
    })
    
    return NextResponse.json(response)
    
  } catch (error) {
    appLogger.error('Error in logs API', error as Error, { correlationId })
    
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}

async function readLogFiles(filters: LogFilters): Promise<LogEntry[]> {
  const logsDir = path.join(process.cwd(), 'logs')
  const allLogs: LogEntry[] = []
  
  try {
    // Get list of log files
    const files = await fs.readdir(logsDir)
    const logFiles = files
      .filter(file => file.endsWith('.log'))
      .sort((a, b) => b.localeCompare(a)) // Newest first
    
    // Read recent log files (limit to last 7 days for performance)
    const filesToRead = logFiles.slice(0, 7)
    
    for (const file of filesToRead) {
      const filePath = path.join(logsDir, file)
      
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const lines = content.trim().split('\n').filter(line => line.trim())
        
        for (const line of lines) {
          try {
            const logEntry = parseLogLine(line)
            if (logEntry && matchesFilters(logEntry, filters)) {
              allLogs.push(logEntry)
            }
          } catch {
            // Skip malformed log lines
            continue
          }
        }
      } catch {
        // Skip files that can't be read
        continue
      }
    }
    
    // Sort by timestamp descending (newest first)
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    return allLogs
    
  } catch (error) {
    appLogger.error('Error reading log files', error as Error)
    return []
  }
}

function parseLogLine(line: string): LogEntry | null {
  try {
    const parsed = JSON.parse(line)
    
    // Generate a unique ID for the log entry
    const id = `${parsed.timestamp}-${Math.random().toString(36).substr(2, 9)}`
    
    // Extract source from logger name or metadata
    let source: LogEntry['source'] = 'APPLICATION'
    if (parsed.service) {
      switch (parsed.service) {
        case 'piper-http':
          source = 'HTTP'
          break
        case 'piper-mcp':
          source = 'MCP'
          break
        case 'piper-ai-sdk':
          source = 'AI_SDK'
          break
        case 'piper-system':
          source = 'SYSTEM'
          break
        default:
          source = 'APPLICATION'
      }
    }
    
    // Extract operation from metadata
    const operation = parsed.operation || parsed.metadata?.operation
    
    // Extract duration from metadata
    const duration = parsed.duration || parsed.metadata?.duration || parsed.timing?.duration
    
    // Extract error information
    let error: LogEntry['error'] | undefined
    if (parsed.error) {
      error = {
        name: parsed.error.name || 'Error',
        message: parsed.error.message || 'Unknown error',
        stack: parsed.error.stack
      }
    }
    
    // Extract token usage
    let tokenUsage: LogEntry['tokenUsage'] | undefined
    if (parsed.tokenUsage) {
      tokenUsage = {
        promptTokens: parsed.tokenUsage.promptTokens || 0,
        completionTokens: parsed.tokenUsage.completionTokens || 0,
        totalTokens: parsed.tokenUsage.totalTokens || 0
      }
    }
    
    // Extract cost information
    let cost: LogEntry['cost'] | undefined
    if (parsed.cost) {
      cost = {
        inputCost: parsed.cost.inputCost || 0,
        outputCost: parsed.cost.outputCost || 0,
        totalCost: parsed.cost.totalCost || 0,
        currency: parsed.cost.currency || 'USD'
      }
    }
    
    return {
      id,
      timestamp: parsed.timestamp,
      level: parsed.level,
      source,
      message: parsed.message || '',
      correlationId: parsed.correlationId,
      userId: parsed.userId,
      requestId: parsed.requestId,
      operation,
      duration,
      error,
      metadata: parsed.metadata || parsed,
      tokenUsage,
      cost
    }
  } catch {
    return null
  }
}

function matchesFilters(log: LogEntry, filters: LogFilters): boolean {
  // Level filter
  if (filters.level && log.level !== filters.level) {
    return false
  }
  
  // Source filter
  if (filters.source && log.source !== filters.source) {
    return false
  }
  
  // Operation filter
  if (filters.operation && log.operation !== filters.operation) {
    return false
  }
  
  // Correlation ID filter
  if (filters.correlationId && (!log.correlationId || !log.correlationId.includes(filters.correlationId))) {
    return false
  }
  
  // User ID filter
  if (filters.userId && (!log.userId || !log.userId.includes(filters.userId))) {
    return false
  }
  
  // Error filter
  if (filters.hasError && !log.error) {
    return false
  }
  
  // Time range filters
  if (filters.startTime) {
    const startTime = new Date(filters.startTime)
    const logTime = new Date(log.timestamp)
    if (logTime < startTime) {
      return false
    }
  }
  
  if (filters.endTime) {
    const endTime = new Date(filters.endTime)
    const logTime = new Date(log.timestamp)
    if (logTime > endTime) {
      return false
    }
  }
  
  // Search filter (searches in message, operation, and metadata)
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase()
    const searchableText = [
      log.message,
      log.operation,
      JSON.stringify(log.metadata)
    ].join(' ').toLowerCase()
    
    if (!searchableText.includes(searchTerm)) {
      return false
    }
  }
  
  return true
}

function calculateAggregations(logs: LogEntry[]) {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  
  // Filter logs from the last hour for real-time metrics
  const recentLogs = logs.filter(log => new Date(log.timestamp) > oneHourAgo)
  
  const errorCount = recentLogs.filter(log => log.level === 'error').length
  const totalRequests = recentLogs.filter(log => log.source === 'HTTP').length
  const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0
  
  // Calculate average response time from HTTP logs with duration
  const httpLogsWithDuration = recentLogs.filter(log => 
    log.source === 'HTTP' && log.duration !== undefined
  )
  const avgResponseTime = httpLogsWithDuration.length > 0
    ? httpLogsWithDuration.reduce((sum, log) => sum + (log.duration || 0), 0) / httpLogsWithDuration.length
    : 0
  
  // Count unique users from recent logs
  const uniqueUsers = new Set(
    recentLogs
      .filter(log => log.userId)
      .map(log => log.userId)
  ).size
  
  return {
    errorRate,
    avgResponseTime,
    totalRequests,
    activeUsers: uniqueUsers
  }
} 