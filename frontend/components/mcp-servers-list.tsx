import React, { useState, useEffect } from 'react';
import { Server, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

interface McpServer {
    name: string;
    command: string;
    args: string[];
    status: 'running' | 'stopped' | 'error';
    lastChecked: string;
    error?: string;
    toolCount: number;
    env: string[];
}

interface ServerResponse {
    servers: McpServer[];
    summary: {
        total: number;
        running: number;
        stopped: number;
        error: number;
    };
    timestamp: string;
}

export function McpServersList() {
    const [serverData, setServerData] = useState<ServerResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchServers = async () => {
        try {
            setRefreshing(true);
            const response = await fetch('http://localhost:4100/api/servers');
            if (!response.ok) {
                throw new Error('Failed to fetch servers');
            }
            const data = await response.json();
            setServerData(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch servers');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchServers();
        // Set up polling every 30 seconds
        const interval = setInterval(fetchServers, 30000);
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'running':
                return 'text-green-500';
            case 'stopped':
                return 'text-yellow-500';
            case 'error':
                return 'text-red-500';
            default:
                return 'text-gray-500';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'running':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'stopped':
                return <AlertCircle className="w-5 h-5 text-yellow-500" />;
            case 'error':
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return null;
        }
    };

    const renderContent = () => {
        if (loading && !refreshing) {
            return (
                <div className="flex items-center justify-center h-[200px]">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-current animate-bounce" />
                        <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.4s]" />
                    </div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-[200px] gap-4">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-red-500">Error Loading Servers</h3>
                        <p className="text-sm text-muted-foreground">{error}</p>
                    </div>
                </div>
            );
        }

        if (!serverData) return null;

        return (
            <>
                <div className="p-4 border-b">
                    <div className="grid grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Total Servers</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{serverData.summary.total}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-green-500">Running</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-green-500">{serverData.summary.running}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-yellow-500">Stopped</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-yellow-500">{serverData.summary.stopped}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-red-500">Error</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-red-500">{serverData.summary.error}</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {serverData.servers.map((server) => (
                        <Card key={server.name} className="relative overflow-hidden">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-md bg-primary/10">
                                            <Server className="w-4 h-4" />
                                        </div>
                                        <CardTitle className="text-lg capitalize">
                                            {server.name.replace('-', ' ')}
                                        </CardTitle>
                                    </div>
                                    {getStatusIcon(server.status)}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Status:</span>
                                        <span className={cn("font-medium", getStatusColor(server.status))}>
                                            {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Tools:</span>
                                        <span className="font-medium">{server.toolCount}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Command:</span>
                                        <code className="px-2 py-1 bg-muted rounded text-xs">
                                            {server.command}
                                        </code>
                                    </div>
                                    {server.env.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {server.env.map((env) => (
                                                <span key={env} className="px-2 py-0.5 text-xs bg-primary/10 rounded-full">
                                                    {env}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {server.error && (
                                        <div className="mt-2 text-sm text-red-500 bg-red-500/10 p-2 rounded">
                                            {server.error}
                                        </div>
                                    )}
                                    <div className="text-xs text-muted-foreground mt-2">
                                        Last checked: {new Date(server.lastChecked).toLocaleString()}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </>
        );
    };

    return (
        <SidebarProvider>
            <div className="flex h-screen w-full">
                <AppSidebar />
                <main className="flex-1 w-full overflow-hidden">
                    <div className="h-full flex flex-col bg-background">
                        <div className="p-4 border-b flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
                            <div className="flex items-center gap-2">
                                <Server className="w-5 h-5" />
                                <h2 className="text-lg font-semibold">MCP Servers</h2>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchServers}
                                disabled={refreshing}
                                className="gap-2"
                            >
                                <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                                Refresh
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {renderContent()}
                        </div>
                    </div>
                </main>
            </div>
        </SidebarProvider>
    );
} 