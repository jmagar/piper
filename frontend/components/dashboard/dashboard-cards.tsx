"use client";

import { useState } from "react";
import {
  User,
  MessagesSquare,
  CircleUser,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Props for the DashboardCards component
 */
interface DashboardCardsProps {
  /** Optional className for styling */
  className?: string;
}

/**
 * DashboardCards Component
 * 
 * Displays a grid of cards with key metrics for the dashboard
 */
export function DashboardCards({ className }: DashboardCardsProps) {
  const [stats] = useState({
    totalMessages: 1248,
    totalChats: 36,
    mcpServers: 4,
    mcpTools: 12,
    documents: 156,
    prompts: 27
  });

  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className || ''}`}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Messages
          </CardTitle>
          <MessagesSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalMessages}</div>
          <p className="text-xs text-muted-foreground">
            Across {stats.totalChats} conversations
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            MCP Servers
          </CardTitle>
          <CircleUser className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.mcpServers}</div>
          <p className="text-xs text-muted-foreground">
            With {stats.mcpTools} available tools
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Knowledge Base
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.documents}</div>
          <p className="text-xs text-muted-foreground">
            Documents in your knowledge base
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Prompts 
          </CardTitle>
          <User className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.prompts}</div>
          <p className="text-xs text-muted-foreground">
            Saved prompts in your library
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 