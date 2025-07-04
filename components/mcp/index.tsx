'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  Download, 
  RefreshCw, 
  Eye, 
  AlertTriangle, 
  Info, 
  Bug, 
  Zap,
  Clock,
  User,
  Server,
  Activity,
  Copy,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types for log entries
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

interface LogResponse {
  logs: LogEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
    hasPrev: boolean
  }
  aggregations?: {
    errorRate: number
    avgResponseTime: number
    totalRequests: number
    activeUsers: number
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

const LOG_LEVEL_COLORS = {
  error: 'bg-red-100 text-red-800 border-red-200',
  warn: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  debug: 'bg-gray-100 text-gray-800 border-gray-200'
}

const LOG_LEVEL_ICONS = {
  error: AlertTriangle,
  warn: AlertTriangle,
  info: Info,
  debug: Bug
}

const SOURCE_COLORS = {
  HTTP: 'bg-green-100 text-green-800',
  MCP: 'bg-purple-100 text-purple-800',
  AI_SDK: 'bg-orange-100 text-orange-800',
  APPLICATION: 'bg-blue-100 text-blue-800',
  SYSTEM: 'bg-gray-100 text-gray-800'
}

const SOURCE_ICONS = {
  HTTP: Activity,
  MCP: Server,
  AI_SDK: Zap,
  APPLICATION: User,
  SYSTEM: Server
}

export default function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<LogFilters>({})
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval] = useState(5000)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    hasNext: false,
    hasPrev: false
  })
  const [aggregations, setAggregations] = useState({
    errorRate: 0,
    avgResponseTime: 0,
    totalRequests: 0,
    activeUsers: 0
  })
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  // Fetch logs from API
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const queryParams = new URLSearchParams()
      
      // Add filters to query
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value))
        }
      })
      
      queryParams.append('page', pagination.page.toString())
      queryParams.append('limit', pagination.limit.toString())
      
      const response = await fetch(`/api/logs?${queryParams}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`)
      }
      
      const data: LogResponse = await response.json()
      
      setLogs(data.logs)
      setPagination(data.pagination)
      if (data.aggregations) {
        setAggregations(data.aggregations)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs')
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.page, pagination.limit])

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, fetchLogs])

  // Initial load
  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Filter handlers
  const updateFilter = (key: keyof LogFilters, value: string | boolean | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  const clearFilters = () => {
    setFilters({})
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Export logs
  const exportLogs = async () => {
    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value))
        }
      })
      queryParams.append('export', 'true')
      
      const response = await fetch(`/api/logs/export?${queryParams}`)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `logs-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      setError('Failed to export logs')
    }
  }

  // Copy correlation ID
  const copyCorrelationId = (correlationId: string) => {
    navigator.clipboard.writeText(correlationId)
  }

  // Toggle log expansion
  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(logId)) {
        newSet.delete(logId)
      } else {
        newSet.add(logId)
      }
      return newSet
    })
  }

  // Memoized filtered logs for performance
  const displayLogs = useMemo(() => {
    return logs.map(log => ({
      ...log,
      isExpanded: expandedLogs.has(log.id)
    }))
  }, [logs, expandedLogs])

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{aggregations.totalRequests.toLocaleString()}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
                <p className="text-2xl font-bold">{(aggregations.errorRate * 100).toFixed(2)}%</p>
              </div>
              <AlertTriangle className={cn(
                "h-8 w-8",
                aggregations.errorRate > 0.05 ? "text-red-500" : "text-green-500"
              )} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">{Math.round(aggregations.avgResponseTime)}ms</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{aggregations.activeUsers}</p>
              </div>
              <User className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Log Viewer</CardTitle>
              <CardDescription>Monitor and analyze application logs in real-time</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? "bg-green-50" : ""}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", autoRefresh && "animate-spin")} />
                {autoRefresh ? "Auto" : "Manual"}
              </Button>
              <Button variant="outline" size="sm" onClick={exportLogs}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
            <div>
              <Select onValueChange={(value) => updateFilter('level', value === 'all' ? undefined : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Log Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Select onValueChange={(value) => updateFilter('source', value === 'all' ? undefined : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="HTTP">HTTP</SelectItem>
                  <SelectItem value="MCP">MCP</SelectItem>
                  <SelectItem value="AI_SDK">AI SDK</SelectItem>
                  <SelectItem value="APPLICATION">Application</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Input
                placeholder="Correlation ID"
                value={filters.correlationId || ''}
                onChange={(e) => updateFilter('correlationId', e.target.value)}
              />
            </div>
            
            <div>
              <Input
                placeholder="User ID"
                value={filters.userId || ''}
                onChange={(e) => updateFilter('userId', e.target.value)}
              />
            </div>
            
            <div>
              <Input
                placeholder="Search logs..."
                value={filters.search || ''}
                onChange={(e) => updateFilter('search', e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear
              </Button>
              <Button size="sm" onClick={fetchLogs} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log List */}
      <Card>
        <CardContent className="p-0">
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-200 text-red-700">
              {error}
            </div>
          )}
          
          <ScrollArea className="h-[600px]">
            <div className="divide-y">
              {loading && logs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                  Loading logs...
                </div>
              ) : displayLogs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No logs found matching the current filters.
                </div>
              ) : (
                displayLogs.map((log) => {
                  const LevelIcon = LOG_LEVEL_ICONS[log.level]
                  const SourceIcon = SOURCE_ICONS[log.source]
                  
                  return (
                    <div key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <LevelIcon className={cn("h-4 w-4", {
                              "text-red-500": log.level === 'error',
                              "text-yellow-500": log.level === 'warn',
                              "text-blue-500": log.level === 'info',
                              "text-gray-500": log.level === 'debug',
                            })} />
                            <SourceIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={LOG_LEVEL_COLORS[log.level]}>
                                {log.level.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className={SOURCE_COLORS[log.source]}>
                                {log.source}
                              </Badge>
                              {log.operation && (
                                <Badge variant="outline" className="text-xs">
                                  {log.operation}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                              {log.duration && (
                                <span className="text-xs text-muted-foreground">
                                  {log.duration}ms
                                </span>
                              )}
                            </div>
                            
                            <p className="text-sm font-medium mb-1 break-words">
                              {log.message}
                            </p>
                            
                            {(log.correlationId || log.userId || log.requestId) && (
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {log.correlationId && (
                                  <button
                                    onClick={() => copyCorrelationId(log.correlationId!)}
                                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                                  >
                                    <Copy className="h-3 w-3" />
                                    Correlation: {log.correlationId.slice(0, 8)}...
                                  </button>
                                )}
                                {log.userId && (
                                  <span>User: {log.userId}</span>
                                )}
                                {log.requestId && (
                                  <span>Request: {log.requestId.slice(0, 8)}...</span>
                                )}
                              </div>
                            )}

                            {/* Token usage and cost display */}
                            {(log.tokenUsage || log.cost) && (
                              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                {log.tokenUsage && (
                                  <span>
                                    Tokens: {log.tokenUsage.totalTokens.toLocaleString()} 
                                    ({log.tokenUsage.promptTokens}/{log.tokenUsage.completionTokens})
                                  </span>
                                )}
                                {log.cost && (
                                  <span className="text-green-600">
                                    Cost: ${log.cost.totalCost.toFixed(4)} {log.cost.currency}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Expandable content */}
                            {(log.error || log.metadata) && (
                              <div className="mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleLogExpansion(log.id)}
                                  className="h-6 px-2 text-xs"
                                >
                                  {log.isExpanded ? (
                                    <ChevronDown className="h-3 w-3 mr-1" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3 mr-1" />
                                  )}
                                  Details
                                </Button>
                                
                                {log.isExpanded && (
                                  <div className="mt-2 p-3 bg-muted rounded-lg">
                                    {log.error && (
                                      <div className="mb-3">
                                        <h4 className="text-sm font-medium mb-1 text-red-700">Error Details</h4>
                                        <p className="text-sm mb-1"><strong>Name:</strong> {log.error.name}</p>
                                        <p className="text-sm mb-2"><strong>Message:</strong> {log.error.message}</p>
                                        {log.error.stack && (
                                          <details className="text-xs">
                                            <summary className="cursor-pointer font-medium">Stack Trace</summary>
                                            <pre className="mt-1 p-2 bg-background rounded text-xs overflow-x-auto">
                                              {log.error.stack}
                                            </pre>
                                          </details>
                                        )}
                                      </div>
                                    )}
                                    
                                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                                      <div>
                                        <h4 className="text-sm font-medium mb-1">Metadata</h4>
                                        <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                                          {JSON.stringify(log.metadata, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                              <DialogHeader>
                                <DialogTitle>Log Details</DialogTitle>
                              </DialogHeader>
                              <ScrollArea className="h-[60vh]">
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium">Timestamp</label>
                                      <p className="text-sm text-muted-foreground">
                                        {new Date(log.timestamp).toLocaleString()}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Level</label>
                                      <p className="text-sm text-muted-foreground">{log.level}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Source</label>
                                      <p className="text-sm text-muted-foreground">{log.source}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Operation</label>
                                      <p className="text-sm text-muted-foreground">{log.operation || 'N/A'}</p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <label className="text-sm font-medium">Message</label>
                                    <Textarea
                                      value={log.message}
                                      readOnly
                                      className="mt-1"
                                      rows={3}
                                    />
                                  </div>
                                  
                                  {log.error && (
                                    <div>
                                      <label className="text-sm font-medium">Error</label>
                                      <Textarea
                                        value={JSON.stringify(log.error, null, 2)}
                                        readOnly
                                        className="mt-1 font-mono text-xs"
                                        rows={8}
                                      />
                                    </div>
                                  )}
                                  
                                  {log.metadata && (
                                    <div>
                                      <label className="text-sm font-medium">Metadata</label>
                                      <Textarea
                                        value={JSON.stringify(log.metadata, null, 2)}
                                        readOnly
                                        className="mt-1 font-mono text-xs"
                                        rows={12}
                                      />
                                    </div>
                                  )}
                                </div>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
          
          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} logs
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={!pagination.hasPrev}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={!pagination.hasNext}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 