"use client";

import * as React from 'react';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import {
  BarChart, 
  BookOpen, 
  Bot,
  Clock,
  Activity,
  Heart,
  ShieldCheck,
  Wrench
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { McpServerStats } from "./mcp-server-stats";
import { DocumentStats } from "./document-stats";
import { ActivityLog } from "./activity-log";
import { AlertsSection } from "./alerts-section";
import { PromptCards } from "./prompts";

/**
 * DashboardLayout Component
 * 
 * Main layout for the dashboard page that organizes all dashboard components
 */
export function DashboardLayout() {
  const [mcpTools, setMcpTools] = useState<Record<string, number>>({
    'Search & Retrieval': 4,
    'Code & Development': 6,
    'Content Generation': 5,
    'Analysis & Processing': 3,
    'File & Document': 4
  });
  
  useEffect(() => {
    // In a real implementation, we would fetch tool data from the API
    // For now, we'll use the mock data initialized in state
  }, []);
  
  return (
    <AppLayout title="Dashboard">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleString()}
            </span>
          </div>
        </div>
        
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="mcp">MCP</TabsTrigger>
            <TabsTrigger value="documents">Knowledge Base</TabsTrigger>
            <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            {/* Small cards section - Recent Activity, Documents, Notifications */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Recent Activity
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <ActivityLog limit={3} compact />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Documents
                  </CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <DocumentStats limit={3} compact />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Notifications
                  </CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="max-h-[180px] overflow-y-auto">
                  <AlertsSection compact />
                </CardContent>
              </Card>
            </div>
            
            {/* Full-width MCP Server stats card */}
            <Card>
              <CardHeader>
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>MCP Servers</CardTitle>
                    <CardDescription>
                      Model Context Protocol servers status and health
                    </CardDescription>
                  </div>
                  <Bot className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                  <McpServerStats />
                  <McpToolsSummary toolCategories={mcpTools} />
                </div>
              </CardContent>
            </Card>
            
            {/* Prompts section */}
            <PromptCards />
          </TabsContent>
          
          <TabsContent value="messages" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="lg:col-span-4">
                <CardHeader>
                  <CardTitle>Message Statistics</CardTitle>
                  <CardDescription>
                    Usage data and statistics about your conversations
                  </CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div className="border rounded-md p-4">
                        <div className="text-sm text-muted-foreground mb-1">Total Messages</div>
                        <div className="text-2xl font-bold">1,284</div>
                      </div>
                      <div className="border rounded-md p-4">
                        <div className="text-sm text-muted-foreground mb-1">Token Usage</div>
                        <div className="text-2xl font-bold">452K</div>
                      </div>
                      <div className="border rounded-md p-4">
                        <div className="text-sm text-muted-foreground mb-1">Regenerations</div>
                        <div className="text-2xl font-bold">78</div>
                      </div>
                    </div>
                    
                    <div className="border rounded-md p-4">
                      <h3 className="text-sm font-medium mb-3">Reactions Summary</h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm flex items-center">
                            👍 Positive
                          </span>
                          <span className="text-sm font-medium">163</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm flex items-center">
                            👎 Negative
                          </span>
                          <span className="text-sm font-medium">24</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm flex items-center">
                            ⭐ Starred
                          </span>
                          <span className="text-sm font-medium">47</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm flex items-center">
                            🔖 Saved
                          </span>
                          <span className="text-sm font-medium">32</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Model Usage</CardTitle>
                  <CardDescription>
                    Statistics by AI model
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-md p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium">claude-3-5-sonnet-20240620</div>
                          <div className="text-xs text-muted-foreground">Anthropic</div>
                        </div>
                        <div className="text-sm font-medium">734 uses</div>
                      </div>
                      <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="bg-primary h-full" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                    
                    <div className="border rounded-md p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium">gpt-4-0613</div>
                          <div className="text-xs text-muted-foreground">OpenAI</div>
                        </div>
                        <div className="text-sm font-medium">324 uses</div>
                      </div>
                      <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="bg-primary h-full" style={{ width: '28%' }}></div>
                      </div>
                    </div>
                    
                    <div className="border rounded-md p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium">mixtral-8x7b</div>
                          <div className="text-xs text-muted-foreground">Mistral AI</div>
                        </div>
                        <div className="text-sm font-medium">226 uses</div>
                      </div>
                      <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="bg-primary h-full" style={{ width: '20%' }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="mcp" className="space-y-4">
            <McpServerStats compact={false} />
          </TabsContent>
          
          <TabsContent value="documents" className="space-y-4">
            <DocumentStats />
          </TabsContent>
          
          <TabsContent value="logs" className="space-y-4">
            <ActivityLog />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

/**
 * McpServerHealth Component
 * 
 * Displays health metrics for MCP servers
 */
function McpServerHealth() {
  const serverHealth = [
    { name: 'OpenAI Server', status: 'healthy', latency: 245, uptime: 99.98 },
    { name: 'Anthropic Claude', status: 'healthy', latency: 320, uptime: 99.95 },
    { name: 'Local LLM', status: 'offline', latency: 0, uptime: 0 },
    { name: 'Mistral AI', status: 'healthy', latency: 280, uptime: 99.90 }
  ];
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-amber-500';
      case 'offline': return 'text-gray-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': 
        return <ShieldCheck className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <ShieldCheck className="h-4 w-4 text-amber-500" />;
      case 'offline':
        return <ShieldCheck className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <ShieldCheck className="h-4 w-4 text-red-500" />;
      default:
        return <ShieldCheck className="h-4 w-4 text-gray-500" />;
    }
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Server Health</h3>
      <div className="space-y-3">
        {serverHealth.map((server) => (
          <div key={server.name} className="flex items-center justify-between border-b pb-2 last:border-0">
            <div className="flex items-center">
              {getStatusIcon(server.status)}
              <span className="ml-2 font-medium">{server.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              {server.status !== 'offline' && (
                <>
                  <span className="text-xs text-muted-foreground">{server.latency}ms</span>
                  <Heart className={`h-3 w-3 ${getStatusColor(server.status)}`} />
                  <span className="text-xs text-muted-foreground">{server.uptime}%</span>
                </>
              )}
              {server.status === 'offline' && (
                <span className="text-xs text-muted-foreground">Offline</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * McpToolsSummary Component
 * 
 * Displays a summary of available MCP tools
 */
interface McpToolsSummaryProps {
  toolCategories: Record<string, number>;
}

function McpToolsSummary({ toolCategories }: McpToolsSummaryProps) {
  const totalTools = Object.values(toolCategories).reduce((sum, count) => sum + count, 0);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Available Tools</h3>
        <span className="text-sm font-medium">{totalTools} total</span>
      </div>
      
      <div className="space-y-3">
        {Object.entries(toolCategories).map(([category, count]) => (
          <div key={category} className="flex items-center justify-between border-b pb-2 last:border-0">
            <div className="flex items-center">
              <Wrench className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="font-medium">{category}</span>
            </div>
            <span className="text-sm text-muted-foreground">{count} tools</span>
          </div>
        ))}
      </div>
    </div>
  );
} 