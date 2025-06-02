'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RefreshCw, CheckCircle, XCircle, Clock, Filter, TrendingUp } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface ToolExecution {
  id: string
  toolName: string
  serverKey: string
  executionTime: number
  success: boolean
  timestamp: string
  errorType?: string
  errorMessage?: string
}

interface ToolStats {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageExecutionTime: number
  mostUsedTool: string
  recentExecutions: ToolExecution[]
}

export default function ToolExecutionHistory() {
  const [data, setData] = useState<ToolStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'success' | 'error' | 'aborted'>('all')
  const [serverFilter, setServerFilter] = useState<string>('all')

  const fetchToolExecutions = async () => {
    try {
      setIsLoading(true)
      
      // Fetch real tool execution data from Enhanced MCP metrics
      const response = await fetch('/api/mcp-tool-executions')
      if (response.ok) {
        const realData = await response.json()
        setData(realData)
      } else {
        // If no real data yet, show a message indicating no executions
        const emptyData: ToolStats = {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          averageExecutionTime: 0,
          mostUsedTool: '',
          recentExecutions: []
        }
        setData(emptyData)
      }
    } catch (error) {
      console.error('Failed to fetch tool execution history:', error)
      toast.error('Failed to load tool execution history')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchToolExecutions()
  }, [])

  const getStatusBadge = (success: boolean, errorType?: string, execution?: ToolExecution) => {
    if (success) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>
    } else if (errorType === 'aborted' || execution?.errorMessage?.includes('aborted')) {
      return <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300"><XCircle className="h-3 w-3 mr-1" />Aborted</Badge>
    } else {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{errorType || 'Error'}</Badge>
    }
  }

  const formatExecutionTime = (ms: number) => {
    if (ms === 0) return 'N/A'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString() + ' ' + date.toLocaleDateString()
  }

  const filteredExecutions = data?.recentExecutions.filter(execution => {
    if (filter === 'success' && !execution.success) return false
    if (filter === 'error' && (execution.success || execution.errorType === 'aborted' || execution.errorMessage?.includes('aborted'))) return false
    if (filter === 'aborted' && !(execution.errorType === 'aborted' || execution.errorMessage?.includes('aborted'))) return false
    if (serverFilter !== 'all' && execution.serverKey !== serverFilter) return false
    return true
  }) || []

  const uniqueServers = [...new Set(data?.recentExecutions.map(e => e.serverKey) || [])]
  const successRate = data ? Math.round((data.successfulExecutions / data.totalExecutions) * 100) : 0

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Executions</p>
                <p className="text-2xl font-bold">{data?.totalExecutions || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">{successRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Execution Time</p>
                <p className="text-2xl font-bold text-purple-600">{formatExecutionTime(data?.averageExecutionTime || 0)}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed Executions</p>
                <p className="text-2xl font-bold text-red-600">{data?.failedExecutions || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Execution History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Recent Tool Executions</CardTitle>
              <CardDescription>
                Detailed history of tool executions with performance metrics
              </CardDescription>
            </div>
            <Button onClick={fetchToolExecutions} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={filter} onValueChange={(value: 'all' | 'success' | 'error' | 'aborted') => setFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                  <SelectItem value="aborted">Aborted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={serverFilter} onValueChange={setServerFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Servers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Servers</SelectItem>
                {uniqueServers.map(server => (
                  <SelectItem key={server} value={server}>{server}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Execution Table */}
          {filteredExecutions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool Name</TableHead>
                  <TableHead>Server</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Execution Time</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Error Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExecutions.map((execution) => (
                  <TableRow key={execution.id}>
                    <TableCell className="font-mono text-sm">
                      {execution.toolName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{execution.serverKey}</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(execution.success, execution.errorType, execution)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatExecutionTime(execution.executionTime)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatTimestamp(execution.timestamp)}
                    </TableCell>
                    <TableCell className="text-sm text-red-600">
                      {execution.errorMessage || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No Tool Executions Yet</p>
              <p className="text-gray-400 text-sm mt-2">
                {data?.totalExecutions === 0 
                  ? 'Tool execution data will appear here once you start using MCP tools in chat'
                  : 'No executions match your current filters'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
          <CardDescription>
            Tool usage patterns and performance analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.mostUsedTool ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-semibold">Most Frequently Used Tool</p>
                  <p className="text-sm text-gray-600 font-mono">{data.mostUsedTool}</p>
                </div>
                <Badge variant="default">Popular</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-xl font-bold text-green-600">{successRate}%</p>
                  <p className="text-xs text-gray-500">overall</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium text-gray-600">Avg Execution Time</p>
                  <p className="text-xl font-bold text-blue-600">{formatExecutionTime(data.averageExecutionTime)}</p>
                  <p className="text-xs text-gray-500">per tool call</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Insights Coming Soon</p>
              <p className="text-gray-400 text-sm mt-2">
                Performance insights will appear here once tools are used
              </p>
            </div>
          )}
                </CardContent>
      </Card>
    </div>
  )
} 