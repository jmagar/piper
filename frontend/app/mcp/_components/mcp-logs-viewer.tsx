"use client"

import { useEffect, useRef, useState } from 'react';
import { AppSidebar } from "@/components/app-sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSocket } from '@/lib/socket';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'debug' | 'warn';
  message: string;
  source?: string;
}

export function McpLogsViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const socket = useSocket();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (!socket) return;

    socket.on('connect', () => {
      setConnected(true);
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Connected to log server'
      }]);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'Disconnected from log server'
      }]);
    });

    socket.on('log', (log: LogEntry) => {
      setLogs(prev => [...prev, log]);
      if (autoScroll && scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('log');
    };
  }, [socket, autoScroll]);

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-500';
      case 'warn': return 'text-yellow-500';
      case 'debug': return 'text-blue-500';
      default: return 'text-green-500';
    }
  };

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <main className="flex-1 w-full overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <h2 className="text-lg font-semibold">MCP Logs</h2>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm">Auto-scroll</span>
            </label>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index} className="whitespace-pre-wrap mb-1">
                  <span className="text-muted-foreground">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>
                  <span className={`font-semibold ${getLevelColor(log.level)}`}>
                    {' '}{log.level.toUpperCase()}
                  </span>
                  {log.source && (
                    <span className="text-muted-foreground"> [{log.source}]</span>
                  )}
                  <span>: {log.message}</span>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </div>
      </main>
    </div>
  );
} 