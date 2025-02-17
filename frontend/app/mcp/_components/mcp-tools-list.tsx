import { useState, useEffect } from 'react';
import { Server, Info, FileText, Search, Cloud, Globe, Terminal, Wrench } from 'lucide-react';
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
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

interface ToolSchema {
    required: string[];
    properties: Record<string, {
        type: string;
        description: string;
    }>;
}

interface ToolInfo {
    name: string;
    description: string;
    requiredParameters: string[];
    schema?: ToolSchema;
}

interface GroupedTools {
    [key: string]: ToolInfo[];
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
    if (toolName.includes('file') || toolName.includes('directory')) return 'filesystem';
    if (toolName.includes('search')) return 'brave-search';
    if (toolName.includes('weather')) return 'weather';
    if (toolName.includes('browse') || toolName.includes('screenshot')) return 'puppeteer';
    if (toolName.includes('fetch') || toolName.includes('http')) return 'fetch';
    return 'other';
};

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
                    {tool.requiredParameters.length > 0 && (
                        <div className="pt-2">
                            <h5 className="text-sm font-medium mb-1.5">Required Parameters:</h5>
                            <div className="flex flex-wrap gap-1.5">
                                {tool.requiredParameters.map((param) => (
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
                    {tool.schema && (
                        <div className="pt-2">
                            <button
                                onClick={() => console.log(tool.schema)}
                                className="text-xs text-primary hover:text-primary/80"
                            >
                                View Schema
                            </button>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

function ServerSection({ name, tools }: { name: string; tools: ToolInfo[] }) {
    const IconComponent = getServerIcon(name);
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
                            <p>{name.replace('-', ' ')} Server</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <h3 className="text-sm font-medium capitalize">
                    {name.replace('-', ' ')}
                    <span className="ml-2 text-xs text-muted-foreground">
                        {tools.length} tools
                    </span>
                </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {tools.map((tool) => (
                    <ToolCard key={tool.name} tool={tool} />
                ))}
            </div>
        </div>
    );
}

export function McpToolsList() {
    const [tools, setTools] = useState<ToolInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTools = async () => {
            try {
                const response = await fetch('http://localhost:4100/api/tools');
                if (!response.ok) {
                    throw new Error('Failed to fetch tools');
                }
                const data = await response.json();
                setTools(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch tools');
            } finally {
                setLoading(false);
            }
        };

        fetchTools();
    }, []);

    const groupedTools = tools.reduce((acc: GroupedTools, tool) => {
        const serverName = getServerFromToolName(tool.name);
        if (!acc[serverName]) {
            acc[serverName] = [];
        }
        acc[serverName].push(tool);
        return acc;
    }, {});

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
                        <h3 className="text-lg font-semibold text-red-500">Error Loading Tools</h3>
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
                        <h2 className="text-lg font-semibold">MCP Tools</h2>
                    </div>
                    <span className="text-sm text-muted-foreground">
                        {tools.length} tools available
                    </span>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-6">
                        {Object.entries(groupedTools).map(([serverName, serverTools]) => (
                            <ServerSection key={serverName} name={serverName} tools={serverTools} />
                        ))}
                    </div>
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