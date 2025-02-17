import { useEffect, useState } from "react"

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'debug';
  message: string;
}

interface LogsViewerProps {
  url: string;
}

export function McpLogsViewer({ url }: LogsViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // TODO: Implement WebSocket connection for logs
    setLogs([
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Logs viewer placeholder'
      },
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Will connect to: ${url}`
      }
    ]);
  }, [url]);

  return (
    <div className="h-full w-full bg-black text-white font-mono p-4 overflow-auto">
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
    </div>
  );
} 