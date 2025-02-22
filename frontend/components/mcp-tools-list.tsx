'use client';

import { useEffect, useState } from 'react';
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mcpApi } from '@/lib/api-client';
import type { Tool } from '@/lib/generated/models/Tool';

function ToolSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

export function McpToolsList() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        setLoading(true);
        const data = await mcpApi.listMcpTools();
        setTools(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tools');
      } finally {
        setLoading(false);
      }
    };

    void fetchTools();
  }, []);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <ToolSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
        <Info className="w-12 h-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-500">Error Loading Tools</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">MCP Tools</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.map(tool => (
          <Card key={tool.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{tool.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{tool.description}</p>
                </div>
                <Badge variant={
                  tool.type === 'system' ? 'default' :
                  tool.type === 'plugin' ? 'secondary' :
                  'outline'
                }>
                  {tool.type ?? 'custom'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Parameters</h4>
                  <div className="space-y-2">
                    {tool.parameters?.map((param, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="font-medium">{param.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{param.type}</Badge>
                          {param.required ? <Badge variant="destructive">Required</Badge> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {tool.metadata !== undefined ? <details className="mt-2">
                    <summary className="text-sm cursor-pointer">Metadata</summary>
                    <pre className="mt-1 text-xs bg-gray-100 p-2 rounded dark:bg-gray-700">
                      {JSON.stringify(tool.metadata, null, 2)}
                    </pre>
                  </details> : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 