import * as React from 'react';
import { useSocket } from '@/lib/socket';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'debug';
  message: string;
}

interface LogsViewerProps {
  url: string;
}

export function McpLogsViewer({ url }: LogsViewerProps) {
  const { socket, isConnected } = useSocket();
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  React.useEffect(() => {
    if (!socket || !isConnected) return;

    const handleLog = (log: string) => {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: log
      };
      setLogs(prev => [...prev, entry]);
      setTimeout(scrollToBottom, 0);
    };

    const handleError = (error: string) => {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: error
      };
      setLogs(prev => [...prev, entry]);
      setTimeout(scrollToBottom, 0);
    };

    const handleClear = () => {
      setLogs([]);
    };

    // Extract server ID from URL
    const serverId = url.split('/').pop() || 'default';

    socket.on(`mcp:${serverId}:log`, handleLog);
    socket.on(`mcp:${serverId}:error`, handleError);
    socket.on(`mcp:${serverId}:clear`, handleClear);

    return () => {
      socket.off(`mcp:${serverId}:log`, handleLog);
      socket.off(`mcp:${serverId}:error`, handleError);
      socket.off(`mcp:${serverId}:clear`, handleClear);
    };
  }, [socket, isConnected, url]);

  return (
    <div ref={containerRef} className="h-full w-full bg-black text-white font-mono p-4 overflow-auto">
      {!isConnected && (
        <div className="text-yellow-500">Connecting to log stream...</div>
      )}
      {logs.map((log, index) => (
        <div key={index} className="whitespace-pre-wrap">
          <span className="text-gray-400">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
          <span className={
            log.level === 'error' ? ' text-red-500' :
            log.level === 'debug' ? ' text-cyan-500' :
            ' text-green-500'
          }> {log.level.toUpperCase()}</span>
          <span>: {log.message}</span>
        </div>
      ))}
      {isConnected && logs.length === 0 && (
        <div className="text-gray-500 italic">No logs available</div>
      )}
    </div>
  );
} 