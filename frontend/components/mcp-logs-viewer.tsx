import * as React from 'react';
import { useSocket } from '@/lib/socket';
// We need the import for the module augmentation to work
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ServerToClientEvents } from '@/types/socket';

interface LogEntry {
  timestamp: string;
  namespace: string;
  level: 'info' | 'error' | 'debug';
  message: string;
}

interface LogsViewerProps {
  url?: string;
}

// Extend the ServerToClientEvents type to include debug events
declare module '@/types/socket' {
  interface ServerToClientEvents {
    [key: `debug:${string}`]: (message: string) => void;
    [key: `mcp:${string}:log`]: (message: string) => void;
    [key: `mcp:${string}:error`]: (message: string) => void;
  }
}

export function McpLogsViewer({ url }: LogsViewerProps) {
  const { socket, isConnected } = useSocket();
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = React.useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  React.useEffect(() => {
    if (!socket || !isConnected) return;

    const handleDebugLog = (namespace: string, message: string) => {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        namespace,
        level: namespace.includes(':error') ? 'error' : 'debug',
        message
      };
      setLogs(prev => [...prev, entry]);
      window.setTimeout(scrollToBottom, 0);
    };

    // Subscribe to all our debug namespaces
    const debugNamespaces = [
      'mcp:langgraph',
      'mcp:langgraph:error',
      'mcp:websocket',
      'mcp:websocket:error',
      'mcp:chat:langchain',
      'mcp:chat:langchain:error',
      'mcp:model',
      'mcp:model:error',
      'mcp:config',
      'mcp:config:error',
      'mcp:memory',
      'mcp:memory:error',
      'mcp:server',
      'mcp:server:error',
      'mcp:tool',
      'mcp:tool:error'
    ];

    debugNamespaces.forEach(namespace => {
      socket.on(`debug:${namespace}`, (message: string) => handleDebugLog(namespace, message));
    });

    // Handle MCP server logs with [info] and [error] prefixes
    socket.on('mcp:server:log', (message: string) => {
      if (message.startsWith('[info]')) {
        handleDebugLog('mcp:server:info', message.substring(7));
      } else if (message.startsWith('[error]')) {
        handleDebugLog('mcp:server:error', message.substring(8));
      } else {
        handleDebugLog('mcp:server:debug', message);
      }
    });

    // If URL is provided, also handle MCP server logs
    if (url) {
      const serverId = url.split('/').pop() || 'default';
      socket.on(`mcp:${serverId}:log`, (message: string) => 
        handleDebugLog(`mcp:${serverId}`, message)
      );
      socket.on(`mcp:${serverId}:error`, (message: string) => 
        handleDebugLog(`mcp:${serverId}:error`, message)
      );
    }

    return () => {
      // Cleanup all listeners
      debugNamespaces.forEach(namespace => {
        socket.off(`debug:${namespace}`);
      });
      if (url) {
        const serverId = url.split('/').pop() || 'default';
        socket.off(`mcp:${serverId}:log`);
        socket.off(`mcp:${serverId}:error`);
      }
    };
  }, [socket, isConnected, url, scrollToBottom]);

  return (
    <div ref={containerRef} className="h-full w-full bg-black text-white font-mono p-4 overflow-auto">
      {!isConnected && (
        <div className="text-yellow-500">Connecting to log stream...</div>
      )}
      {logs.map((log, index) => (
        <div key={index} className="whitespace-pre-wrap">
          <span className="text-gray-400">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
          <span className="text-purple-400"> {log.namespace}</span>
          <span className={
            log.level === 'error' ? ' text-red-500' :
            log.level === 'debug' ? ' text-cyan-500' :
            ' text-green-500'
          }> {log.level.toUpperCase()}</span>
          <span className="text-white">: {log.message}</span>
        </div>
      ))}
      {isConnected && logs.length === 0 && (
        <div className="text-gray-500 italic">No logs available</div>
      )}
    </div>
  );
} 