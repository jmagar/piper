"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import { 
  Activity, 
  Bot, 
  Terminal, 
  Server, 
  Cpu, 
  MessageSquare, 
  Database,
  Wrench,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface ServerStatus {
  servers: Array<{
    name: string;
    status: 'running' | 'stopped' | 'error';
    toolCount: number;
  }>;
  summary: {
    total: number;
    running: number;
    stopped: number;
    error: number;
  };
}

interface ToolInfo {
  name: string;
  description: string;
  requiredParameters: string[];
}

interface McpConfig {
  llm: {
    model_provider: string;
    model: string;
  };
}

export default function DashboardPage() {
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [mcpConfig, setMcpConfig] = useState<McpConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [serversRes, toolsRes, configRes] = await Promise.all([
          fetch('http://localhost:4100/api/servers'),
          fetch('http://localhost:4100/api/tools'),
          fetch('http://localhost:4100/api/config')
        ]);

        if (serversRes.ok && toolsRes.ok && configRes.ok) {
          const [serversData, toolsData, configData] = await Promise.all([
            serversRes.json(),
            toolsRes.json(),
            configRes.json()
          ]);

          setServerStatus(serversData);
          setTools(toolsData);
          setMcpConfig(configData);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const quickLinks = [
    { name: 'Chat', icon: MessageSquare, href: '/chat', color: 'text-blue-500' },
    { name: 'Terminal', icon: Terminal, href: '/terminal', color: 'text-green-500' },
    { name: 'Servers', icon: Server, href: '/mcp/servers', color: 'text-purple-500' },
    { name: 'Tools', icon: Wrench, href: '/mcp/tools', color: 'text-orange-500' },
    { name: 'Logs', icon: Activity, href: '/mcp/logs', color: 'text-red-500' },
    { name: 'Knowledge Base', icon: Database, href: '/knowledge', color: 'text-cyan-500' },
  ];

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 w-full overflow-hidden">
          <div className="h-full flex flex-col bg-background">
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                  <p className="text-muted-foreground">
                    Welcome to your Model Context Protocol control center
                  </p>
                </div>
                <Button asChild className="gap-2">
                  <Link href="/chat">
                    <Bot className="w-4 h-4" />
                    New Chat
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>

              <div className="grid gap-6">
                {/* Quick Links */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  {quickLinks.map((link) => (
                    <Link key={link.name} href={link.href}>
                      <Card className="hover:shadow-md transition-all cursor-pointer">
                        <CardHeader className="p-4">
                          <div className="flex items-center gap-2">
                            <div className={cn("p-2 rounded-md bg-primary/10", link.color)}>
                              <link.icon className="w-4 h-4" />
                            </div>
                            <CardTitle className="text-base">{link.name}</CardTitle>
                          </div>
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </section>

                {/* System Overview */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {/* Server Status */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Server Status</CardTitle>
                        <Server className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <CardDescription>
                        MCP Server health overview
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="flex items-center justify-center h-[100px]">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-current animate-bounce" />
                            <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.2s]" />
                            <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </div>
                      ) : serverStatus ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="flex flex-col items-center p-2 bg-green-500/10 rounded-lg">
                              <span className="text-2xl font-bold text-green-500">{serverStatus.summary.running}</span>
                              <span className="text-xs text-muted-foreground">Running</span>
                            </div>
                            <div className="flex flex-col items-center p-2 bg-yellow-500/10 rounded-lg">
                              <span className="text-2xl font-bold text-yellow-500">{serverStatus.summary.stopped}</span>
                              <span className="text-xs text-muted-foreground">Stopped</span>
                            </div>
                            <div className="flex flex-col items-center p-2 bg-red-500/10 rounded-lg">
                              <span className="text-2xl font-bold text-red-500">{serverStatus.summary.error}</span>
                              <span className="text-xs text-muted-foreground">Error</span>
                            </div>
                          </div>
                          <ScrollArea className="h-[120px]">
                            <div className="space-y-2">
                              {serverStatus.servers.map((server) => (
                                <div key={server.name} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    {server.status === 'running' ? (
                                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    ) : server.status === 'stopped' ? (
                                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-red-500" />
                                    )}
                                    <span className="text-sm font-medium">{server.name}</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">{server.toolCount} tools</span>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-[100px] text-muted-foreground">
                          No data available
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Tools Overview */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Available Tools</CardTitle>
                        <Wrench className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <CardDescription>
                        Quick overview of MCP tools
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="flex items-center justify-center h-[100px]">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-current animate-bounce" />
                            <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.2s]" />
                            <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </div>
                      ) : tools.length > 0 ? (
                        <ScrollArea className="h-[180px]">
                          <div className="space-y-2">
                            {tools.slice(0, 5).map((tool) => (
                              <div key={tool.name} className="p-2 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 rounded-md bg-primary/10">
                                    <Sparkles className="w-3 h-3" />
                                  </div>
                                  <span className="text-sm font-medium">{tool.name}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {tool.description}
                                </p>
                              </div>
                            ))}
                            {tools.length > 5 && (
                              <Button variant="ghost" className="w-full text-sm" asChild>
                                <a href="/mcp/tools">
                                  View all {tools.length} tools
                                  <ArrowRight className="w-4 h-4 ml-2" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="flex items-center justify-center h-[100px] text-muted-foreground">
                          No tools available
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* MCP Stats */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">MCP Stats</CardTitle>
                        <Bot className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <CardDescription>
                        Model Context Protocol statistics
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="flex items-center justify-center h-[100px]">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-current animate-bounce" />
                            <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.2s]" />
                            <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Server className="w-4 h-4 text-purple-500" />
                                <span className="text-sm">Total Servers</span>
                              </div>
                              <p className="text-2xl font-bold">
                                {serverStatus?.summary.total || 0}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span className="text-sm">Connected</span>
                              </div>
                              <p className="text-2xl font-bold">
                                {serverStatus?.summary.running || 0}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Wrench className="w-4 h-4 text-orange-500" />
                                <span className="text-sm">Available Tools</span>
                              </div>
                              <p className="text-2xl font-bold">
                                {tools.length}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-blue-500" />
                                <span className="text-sm">Model</span>
                              </div>
                              <div>
                                <p className="text-sm font-semibold capitalize">
                                  {mcpConfig?.llm.model_provider || 'N/A'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {mcpConfig?.llm.model || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}

