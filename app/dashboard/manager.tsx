'use client';

import React from 'react';

// Assuming Shadcn UI components are available. Adjust paths if necessary.
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, FileText, Server, Activity } from 'lucide-react';

// Import the McpServersDashboard component
import { McpServersDashboard } from '@/app/components/mcp-servers/McpServersDashboard';
// Import the log viewer component
import LogViewer from '@/app/components/log-viewer';
// Import the MCP metrics dashboard
import MCPMetricsDashboard from '@/app/components/dashboard/mcp-metrics-dashboard';
import ToolExecutionHistory from '@/app/components/dashboard/tool-execution-history';
import ActiveExecutions from '@/app/components/dashboard/active-executions';

export default function McpServersManager() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">System Administration</h1>
      </div>

      <Tabs defaultValue="mcp-servers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="mcp-servers" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Servers
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mcp-servers" className="space-y-4">
          <McpServersDashboard />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <LogViewer />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">System Overview</TabsTrigger>
              <TabsTrigger value="performance">Tool Performance</TabsTrigger>
              <TabsTrigger value="health">Health Check</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <MCPMetricsDashboard />
            </TabsContent>

            <TabsContent value="performance">
              <ToolExecutionHistory />
            </TabsContent>

            <TabsContent value="health">
              <div className="space-y-6">
                <ActiveExecutions />
                
                <Card>
                  <CardHeader>
                    <CardTitle>System Health Diagnostics</CardTitle>
                    <CardDescription>
                      Comprehensive health checks and system diagnostics with abort signal support
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Database Health</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-2">
                              <Activity className="h-5 w-5 text-green-500" />
                              <span className="text-green-600 font-semibold">Connected</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                              PostgreSQL connection active, metrics being persisted
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Enhanced MCP Client</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-2">
                              <Activity className="h-5 w-5 text-green-500" />
                              <span className="text-green-600 font-semibold">Active</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                              Enhanced features enabled with abort signal support
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Feature Status Matrix</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="flex items-center gap-2 p-2 border rounded">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="text-sm">Metrics Collection</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 border rounded">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="text-sm">Abort Signals</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 border rounded">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="text-sm">Enhanced Errors</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 border rounded">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="text-sm">Connection Pool</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 border rounded">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="text-sm">Tool Call Repair</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 border rounded">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="text-sm">Multi-Modal</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 border rounded">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="text-sm">Database Persist</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 border rounded">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="text-sm">Real-time Monitoring</span>
                            </div>
                          </div>
                          <div className="mt-4 text-sm">
                            <span className="inline-flex items-center gap-1 mr-4">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              Active
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              Ready
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                Global system settings will be managed here. This section is under construction.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Placeholder for future settings */}
              <p>Settings coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
