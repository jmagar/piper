import { useEffect, useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

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

    const getLogColor = (level: string) => {
        switch (level) {
            case 'error':
                return 'text-red-500';
            case 'debug':
                return 'text-blue-500';
            default:
                return 'text-gray-900 dark:text-gray-100';
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">MCP Logs</h2>
                <div className="flex items-center gap-2">
                    <span className="text-sm">Status:</span>
                    <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
            </div>
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-2 font-mono text-sm">
                    {logs.map((log, index) => (
                        <div key={index} className={`whitespace-pre-wrap ${getLogColor(log.level)}`}>
                            <span className="text-gray-500">[{log.timestamp}] </span>
                            {log.message}
                        </div>
                    ))}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>
        </div>
    );
} 