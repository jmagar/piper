"use client";

import * as React from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { 
  BarChart, 
  ServerCrash, 
  AlertCircle, 
  BookOpen, 
  MessageSquare, 
  Bot,
  GitMerge,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PromptCards } from "./prompts";
import { McpServerStats } from "./mcp-server-stats";
import { DocumentStats } from "./document-stats";
import { AlertsSection } from "./alerts-section";
import { ActivityLog } from "./activity-log";

/**
 * DashboardLayout Component
 * 
 * Main layout for the dashboard page that organizes all dashboard components
 */
export function DashboardLayout() {
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
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="mcp">MCP</TabsTrigger>
            <TabsTrigger value="documents">Knowledge Base</TabsTrigger>
            <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <AlertsSection />
            <PromptCards />
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Recent Activity
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <ActivityLog limit={5} compact />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    MCP Servers
                  </CardTitle>
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <McpServerStats compact />
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
                  <DocumentStats compact />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="lg:col-span-4">
                <CardHeader>
                  <CardTitle>Message Analytics</CardTitle>
                  <CardDescription>
                    Statistics about messages sent and received
                  </CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="h-[300px]">
                    {/* This would be a chart component */}
                    <div className="flex h-full items-center justify-center">
                      <BarChart className="h-16 w-16 text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Chart visualization coming soon</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>User Activity</CardTitle>
                  <CardDescription>
                    Usage patterns and active times
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {/* This would be another chart component */}
                    <div className="flex h-full items-center justify-center">
                      <BarChart className="h-16 w-16 text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Chart visualization coming soon</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="mcp" className="space-y-4">
            <McpServerStats />
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