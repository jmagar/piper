'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Server, Activity, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface MCPMetrics {
  servers: Array<{
    key: string
    label: string
    status: string
    toolsCount: number
    transportType: string
    metrics: unknown
    toolStats: unknown
  }>
  summary: {
    totalServers: number
    connectedServers: number
    totalTools: number
    errorServers: number
  }
}

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  details: {
    totalServers: number
    connectedServers: number
    errorServers: number
    totalTools: number
    poolConnections: number
  }
  recommendations: string[]
}

interface PoolStats {
  totalConnections: number
  activeClients: string[]
}

interface MCPDashboardData {
  success: boolean
  timestamp: string
  data: {
    metrics: MCPMetrics | null
    health: HealthCheck
    pool: PoolStats
  }
}

export default function MCPMetricsDashboard() {
  const [data, setData] = useState<MCPDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/mcp-metrics')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setData(result)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (error) {
      console.error('Failed to fetch MCP metrics:', error)
      toast.error('Failed to load MCP metrics')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchMetrics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [autoRefresh])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Error</Badge>
      case 'no_tools_found':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />No Tools</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data || !data.success) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Metrics</h3>
            <p className="text-gray-600 mb-4">Unable to fetch Enhanced MCP metrics</p>
            <Button onClick={fetchMetrics}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { metrics, health, pool } = data.data
  const summary = metrics?.summary || { totalServers: 0, connectedServers: 0, totalTools: 0, errorServers: 0 }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Enhanced MCP Metrics</h2>
          <p className="text-gray-600">Real-time monitoring of Model Context Protocol servers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'text-green-500' : 'text-gray-400'}`} />
            Auto Refresh: {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button onClick={fetchMetrics} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <p className="text-sm text-gray-500">Last updated: {lastUpdated}</p>
      )}

      {/* Health Status */}
      <Card className={`border-2 ${getHealthStatusColor(health.status)}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {health.status === 'healthy' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : health.status === 'degraded' ? (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            System Health: {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
          </CardTitle>
          <CardDescription>
            Overall MCP system health assessment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {health.recommendations.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Recommendations:</h4>
              <ul className="space-y-1">
                {health.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Servers</p>
                <p className="text-2xl font-bold">{summary.totalServers}</p>
              </div>
              <Server className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Connected</p>
                <p className="text-2xl font-bold text-green-600">{summary.connectedServers}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available Tools</p>
                <p className="text-2xl font-bold text-purple-600">{summary.totalTools}</p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Error Servers</p>
                <p className="text-2xl font-bold text-red-600">{summary.errorServers}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Server Details */}
      {metrics && metrics.servers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Server Status Details</CardTitle>
            <CardDescription>
              Individual server connection status and tool counts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.servers.map((server) => (
                <div key={server.key} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{server.label}</h4>
                      {getStatusBadge(server.status)}
                      <Badge variant="outline">{server.transportType}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 font-mono">{server.key}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{server.toolsCount} tools</p>
                    <p className="text-sm text-gray-600">available</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Pool Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Pool Statistics</CardTitle>
          <CardDescription>
            Enhanced MCP Client connection pooling metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Connections</p>
              <p className="text-2xl font-bold">{pool.totalConnections}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Clients</p>
              <p className="text-2xl font-bold">{pool.activeClients.length}</p>
            </div>
          </div>
          {pool.activeClients.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-600 mb-2">Active Client IDs:</p>
              <div className="flex flex-wrap gap-1">
                {pool.activeClients.map((clientId) => (
                  <Badge key={clientId} variant="outline" className="text-xs">
                    {clientId}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Status */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Features Status</CardTitle>
          <CardDescription>
            Status of advanced Enhanced MCP Client capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-semibold">Metrics Collection</p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-semibold">Error Handling</p>
                <p className="text-sm text-gray-600">Enhanced</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-semibold">Connection Pooling</p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-semibold">Tool Call Repair</p>
                <p className="text-sm text-gray-600">Ready</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-semibold">Multi-Modal Support</p>
                <p className="text-sm text-gray-600">Ready</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-semibold">Database Persistence</p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 