import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface Server {
  name: string;
  status: 'running' | 'stopped' | 'error';
  error?: string;
  lastChecked: string;
  toolCount: number;
  env: string[];
}

interface ServersListProps {
  servers: Server[];
}

function ServerSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5 mt-2" />
      </CardContent>
    </Card>
  )
}

export function McpServersList({ servers }: ServersListProps) {
  const [loading] = useState(false)

  return (
    <div className="grid gap-4">
      {loading ? (
        Array.from({ length: 3 }).map((_, index) => (
          <ServerSkeleton key={`skeleton-${index}`} />
        ))
      ) : (
        servers.map((server) => (
          <Card key={server.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{server.name}</CardTitle>
                <Badge
                  variant={
                    server.status === 'running'
                      ? 'success'
                      : server.status === 'error'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {server.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Last checked: </span>
                  {new Date(server.lastChecked).toLocaleString()}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Tools available: </span>
                  {server.toolCount}
                </div>
                {server.error && (
                  <div className="text-sm text-destructive">{server.error}</div>
                )}
                {server.env.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {server.env.map((env) => (
                      <Badge key={env} variant="outline">
                        {env}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
} 