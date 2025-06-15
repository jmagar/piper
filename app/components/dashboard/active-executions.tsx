'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, StopCircle, Activity, Zap } from 'lucide-react'
import { toast } from '@/components/ui/toast'

interface ActiveExecution {
  callId: string
  toolName?: string
  serverId?: string
  startTime?: string
}

export default function ActiveExecutions() {
  const [activeExecutions, setActiveExecutions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [aborting, setAborting] = useState<Set<string>>(new Set())

  const fetchActiveExecutions = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/mcp-abort-tool')
      if (response.ok) {
        const data = await response.json()
        setActiveExecutions(data.activeExecutions || [])
      }
    } catch (error) {
      console.error('Failed to fetch active executions:', error)
      toast({ title: 'Failed to load active executions', status: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const abortExecution = async (callId: string) => {
    try {
      setAborting(prev => new Set(prev).add(callId))
      
      const response = await fetch('/api/mcp-abort-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'abort', callId })
      })

      if (response.ok) {
        const data = await response.json()
        toast({ title: data.message, status: 'success' })
        await fetchActiveExecutions() // Refresh the list
      } else {
        const error = await response.json()
        toast({ title: error.error || 'Failed to abort execution', status: 'error' })
      }
    } catch (error) {
      console.error('Failed to abort execution:', error)
      toast({ title: 'Failed to abort execution', status: 'error' })
    } finally {
      setAborting(prev => {
        const newSet = new Set(prev)
        newSet.delete(callId)
        return newSet
      })
    }
  }

  const abortAllExecutions = async () => {
    try {
      const response = await fetch('/api/mcp-abort-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'abort-all' })
      })

      if (response.ok) {
        const data = await response.json()
        toast({ title: data.message, status: 'success' })
        await fetchActiveExecutions()
      } else {
        const error = await response.json()
        toast({ title: error.error || 'Failed to abort all executions', status: 'error' })
      }
    } catch (error) {
      console.error('Failed to abort all executions:', error)
      toast({ title: 'Failed to abort all executions', status: 'error' })
    }
  }

  useEffect(() => {
    fetchActiveExecutions()
    
    // Poll for updates every 2 seconds
    const interval = setInterval(fetchActiveExecutions, 2000)
    return () => clearInterval(interval)
  }, [])

  const parseCallId = (callId: string): ActiveExecution => {
    // Try to extract information from callId if it follows a pattern like "serverId-toolName-timestamp"
    const parts = callId.split('-')
    return {
      callId,
      serverId: parts[0] || undefined,
      toolName: parts[1] || undefined,
      startTime: parts[2] ? new Date(parseInt(parts[2])).toLocaleTimeString() : undefined
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Active Tool Executions
            </CardTitle>
            <CardDescription>
              Currently running tool executions with abort controls
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {activeExecutions.length > 0 && (
              <Button 
                onClick={abortAllExecutions} 
                variant="destructive" 
                size="sm"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Abort All
              </Button>
            )}
            <Button onClick={fetchActiveExecutions} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activeExecutions.length === 0 ? (
          <div className="text-center py-8">
            <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No Active Executions</p>
            <p className="text-gray-400 text-sm mt-2">
              Tool executions will appear here when they&apos;re running
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeExecutions.map((callId) => {
              const execution = parseCallId(callId)
              const isAborting = aborting.has(callId)
              
              return (
                <div 
                  key={callId} 
                  className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 border-blue-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-blue-100 text-blue-700">
                        Running
                      </Badge>
                      {execution.toolName && (
                        <span className="font-mono text-sm text-gray-700">
                          {execution.toolName}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Call ID: <span className="font-mono">{callId}</span></div>
                      {execution.serverId && (
                        <div>Server: <span className="font-mono">{execution.serverId}</span></div>
                      )}
                      {execution.startTime && (
                        <div>Started: {execution.startTime}</div>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => abortExecution(callId)}
                    variant="destructive"
                    size="sm"
                    disabled={isAborting}
                  >
                    {isAborting ? (
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <StopCircle className="h-3 w-3 mr-1" />
                    )}
                    {isAborting ? 'Aborting...' : 'Abort'}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 