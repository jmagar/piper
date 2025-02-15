import { useEffect, useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LogEntry {
    timestamp: string;
    message: string;
    level: 'info' | 'error' | 'debug';
}

export function McpLogsViewer() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Connect to WebSocket for real-time logs
        const ws = new WebSocket('ws://localhost:4100/ws/logs');
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('Connected to MCP logs WebSocket');
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const logEntry = JSON.parse(event.data);
                setLogs(prev => [...prev, logEntry]);
                
                // Auto-scroll to bottom
                if (scrollRef.current) {
                    scrollRef.current.scrollIntoView({ behavior: 'smooth' });
                }
            } catch (error) {
                console.error('Error parsing log message:', error);
            }
        };

        ws.onclose = () => {
            console.log('Disconnected from MCP logs WebSocket');
            setIsConnected(false);
        };

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const formatTimestamp = (isoString: string) => {
        const date = new Date(isoString);
        return `[${format(date, 'yyyy/MM/dd')}][${format(date, 'hh:mm:ss aa')} EST]`;
    };

    const getLogStyles = (level: string) => {
        const baseStyles = "px-4 py-1.5 rounded font-mono text-sm transition-colors";
        switch (level) {
            case 'error':
                return cn(baseStyles, 'bg-red-500/10 text-red-500 dark:bg-red-500/20');
            case 'debug':
                return cn(baseStyles, 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20');
            case 'info':
                return cn(baseStyles, 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100');
            default:
                return baseStyles;
        }
    };

    const getSectionStyles = (message: string) => {
        if (message.startsWith('===')) {
            return "mt-6 mb-2 font-semibold text-primary border-b pb-1";
        }
        return "";
    };

    return (
        <div className="h-full flex flex-col bg-background">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <h2 className="text-lg font-semibold">MCP Logs</h2>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <span className={cn(
                        "inline-block w-2 h-2 rounded-full",
                        isConnected ? "bg-green-500" : "bg-red-500",
                        "animate-pulse"
                    )} />
                    <span className={cn(
                        "text-sm font-medium",
                        isConnected ? "text-green-500" : "text-red-500"
                    )}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
            </div>
            <ScrollArea className="flex-1">
                <div className="space-y-1 p-4">
                    {logs.map((log, index) => (
                        <div 
                            key={index} 
                            className={cn(
                                "group transition-all",
                                getLogStyles(log.level),
                                getSectionStyles(log.message)
                            )}
                        >
                            <span className="text-muted-foreground mr-2">
                                {formatTimestamp(log.timestamp)}
                            </span>
                            <span className={cn(
                                log.message.startsWith('===') && 'text-primary font-semibold'
                            )}>
                                {log.message}
                            </span>
                        </div>
                    ))}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>
        </div>
    );
} 