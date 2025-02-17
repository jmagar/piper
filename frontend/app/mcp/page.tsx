"use client"

import { useState, useEffect } from 'react';
import { Server, Info, FileText, Search, Cloud, Globe, Terminal, Wrench, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSocket } from '@/lib/socket';
import type { ServerStatus, ServerInfo } from '@/types/server';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ToolInfo {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, unknown>;
        required: string[];
    };
}

const getServerIcon = (serverName: string) => {
    switch (serverName.toLowerCase()) {
        case 'filesystem':
            return FileText;
        case 'brave-search':
            return Search;
        case 'weather':
            return Cloud;
        case 'puppeteer':
            return Globe;
        case 'fetch':
            return Globe;
        default:
            return Terminal;
    }
};

const getServerFromToolName = (toolName: string): string => {
    // Media processing tools
    if (toolName.match(/^(execute-ffmpeg|convert-video|compress-video|trim-video|compress-image|convert-image|resize-image|rotate-image|add-watermark|apply-effect|generate_flux_image)$/)) {
        return 'mediaProcessor';
    }
    
    // File system tools
    if (toolName.match(/^(read_file|write_file|edit_file|create_directory|list_directory|directory_tree|move_file|search_files|get_file_info|list_allowed_directories|read_multiple_files)$/)) {
        return 'filesystem';
    }
    
    // Search tools
    if (toolName.match(/^(brave_web_search|brave_local_search)$/)) {
        return 'brave-search';
    }
    if (toolName.match(/^web_search$/)) {
        return 'searxng';
    }
    
    // Weather tools
    if (toolName.match(/^(get-alerts|get-forecast)$/)) {
        return 'weather';
    }
    
    // Browser automation tools
    if (toolName.match(/^puppeteer_/)) {
        return 'puppeteer';
    }
    
    // Shell tools
    if (toolName.match(/^(shell_|run_command|run_script|run_python_code_in_sandbox)$/)) {
        return 'shell';
    }
    
    // Docker tools
    if (toolName.match(/^(create-container|deploy-compose|get-logs|list-containers)$/)) {
        return 'docker-mcp';
    }
    
    // GitHub tools
    if (toolName.match(/^(create_or_update_file|search_repositories|create_repository|get_file_contents|push_files|create_issue|create_pull_request|fork_repository|create_branch|list_commits|list_issues|update_issue|add_issue_comment|search_code|search_issues|search_users|get_issue|collect_code)$/)) {
        return 'github';
    }
    
    // Time tools
    if (toolName.match(/^(get_current_time|convert_time)$/)) {
        return 'time';
    }
    
    // Package documentation tools
    if (toolName.match(/^lookup_.*_doc$/)) {
        return 'package-docs';
    }
    
    // Neurolora tools
    if (toolName.match(/^(analyze_code|create_github_issues)$/)) {
        return 'aindreyway-mcp-neurolora';
    }
    
    // Sequential thinking tools
    if (toolName === 'sequentialthinking') {
        return 'sequential-thinking';
    }
    
    // MCP installer tools
    if (toolName.match(/^(install_.*_mcp_server|install_base_servers)$/)) {
        return 'mcp-installer';
    }

    // Fetch tools
    if (toolName === 'fetch') {
        return 'fetch';
    }
    
    // Default to other if no match found
    return 'other';
};

function getStatusIcon(status: ServerInfo['status']) {
    switch (status) {
        case 'ready':
            return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case 'starting':
            return <AlertCircle className="h-4 w-4 text-yellow-500" />;
        case 'error':
            return <XCircle className="h-4 w-4 text-red-500" />;
        default:
            return null;
    }
}

function ToolCard({ tool }: { tool: ToolInfo }) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="p-3 rounded-lg border bg-card text-card-foreground hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-primary/10">
                            <Wrench className="w-4 h-4" />
                        </div>
                        <div className="flex-1 truncate">
                            <h4 className="font-medium text-sm truncate">{tool.name}</h4>
                        </div>
                    </div>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4">
                <div className="space-y-2">
                    <h4 className="font-semibold text-base">{tool.name}</h4>
                    <p className="text-sm text-muted-foreground">
                        {tool.description}
                    </p>
                    {tool.parameters.required.length > 0 && (
                        <div className="pt-2">
                            <h5 className="text-sm font-medium mb-1.5">Required Parameters:</h5>
                            <div className="flex flex-wrap gap-1.5">
                                {tool.parameters.required.map((param) => (
                                    <span
                                        key={param}
                                        className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary"
                                    >
                                        {param}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

function ServerSection({ server }: { server: ServerInfo }) {
    const IconComponent = getServerIcon(server.name);
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 sticky top-0 bg-background/95 py-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <div className="p-1.5 rounded-md bg-primary/10">
                                <IconComponent className="w-4 h-4 text-primary" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{server.name.replace('-', ' ')} Server</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <h3 className="text-sm font-medium capitalize">
                    {server.name.replace('-', ' ')}
                    <span className="ml-2 text-xs text-muted-foreground">
                        {server.tools?.length || 0} tools
                    </span>
                </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {server.tools?.map((tool) => (
                    <ToolCard key={tool.name} tool={tool} />
                ))}
            </div>
        </div>
    );
}

function ServerCard({ server }: { server: ServerInfo }) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{server.name}</CardTitle>
                    <div className="flex items-center gap-2">
                        {getStatusIcon(server.status)}
                        <Badge
                            variant={
                                server.status === 'ready'
                                    ? 'success'
                                    : server.status === 'error'
                                    ? 'destructive'
                                    : 'secondary'
                            }
                        >
                            {server.status}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="text-sm">
                        <span className="text-muted-foreground">Version: </span>
                        {server.version} (Protocol: {server.protocol_version})
                    </div>
                    <div className="text-sm">
                        <span className="text-muted-foreground">Command: </span>
                        {server.command} {server.args.join(' ')}
                    </div>
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
                    {server.features.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Features:</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {server.features.map((feature) => (
                                    <Badge key={feature} variant="outline">
                                        {feature}
                                    </Badge>
                                ))}
                            </div>
                        </div>
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
    );
}

export default function McpPage() {
    const [servers, setServers] = useState<ServerInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const socket = useSocket();

    // Handle real-time server status updates
    useEffect(() => {
        if (!socket) return;

        socket.on('server:status', (update: { serverName: string } & ServerStatus) => {
            setServers(prev => prev.map(server => 
                server.name === update.serverName
                    ? {
                        ...server,
                        status: update.status,
                        error: update.error,
                        lastChecked: new Date().toISOString(),
                        toolCount: update.tools.length,
                        tools: update.tools,
                        features: update.features,
                        version: update.version,
                        protocol_version: update.protocol_version
                    }
                    : server
            ));
        });

        return () => {
            socket.off('server:status');
        };
    }, [socket]);

    // Initial data fetch
    useEffect(() => {
        const fetchData = async () => {
            try {
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';
                const response = await fetch(`${baseUrl}/api/servers`);

                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }

                const data = await response.json();
                setServers(data.servers);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Refresh data every minute as a fallback
        const refreshInterval = setInterval(fetchData, 60000);

        return () => {
            clearInterval(refreshInterval);
        };
    }, []);

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center h-full">
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
                <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
                    <Info className="w-12 h-12 text-red-500" />
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-red-500">Error Loading Data</h3>
                        <p className="text-sm text-muted-foreground">{error}</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col h-full">
                <div className="p-4 border-b flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <Server className="w-5 h-5" />
                        <h2 className="text-lg font-semibold">MCP Servers & Tools</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                            {servers.length} servers
                        </span>
                    </div>
                </div>
                <div className="p-4 flex-1 overflow-hidden">
                    <Tabs defaultValue="tools" className="w-full h-full">
                        <div className="flex justify-center mb-4">
                            <TabsList className="grid w-[400px] grid-cols-2">
                                <TabsTrigger value="tools">Tools</TabsTrigger>
                                <TabsTrigger value="servers">Servers</TabsTrigger>
                            </TabsList>
                        </div>
                        <div className="h-[calc(100%-48px)] overflow-hidden">
                            <TabsContent value="tools" className="h-full overflow-auto">
                                <div className="space-y-6">
                                    {servers.map((server) => (
                                        <ServerSection key={server.name} server={server} />
                                    ))}
                                </div>
                            </TabsContent>
                            <TabsContent value="servers" className="h-full overflow-auto">
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {servers.map((server) => (
                                        <ServerCard key={server.name} server={server} />
                                    ))}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
        );
    };

    return (
        <SidebarProvider>
            <div className="flex h-screen w-full">
                <AppSidebar />
                <main className="flex-1 w-full overflow-hidden">
                    {renderContent()}
                </main>
            </div>
        </SidebarProvider>
    );
} 