"use client"

import { useEffect, useRef, useState } from 'react';

import { AppSidebar } from "@/components/app-sidebar";
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';

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
      if (log.message.includes('base_url not configured') ||
          log.message.includes('Server returned status')) {
        return;
      }
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
      case 'error': return 'text-destructive';
      case 'warn': return 'text-warning';
      case 'debug': return 'text-info';
      default: return 'text-success';
    }
  };

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <main className="flex-1 w-full overflow-hidden bg-sidebar">
        <div className="flex flex-col h-full">
          <div className="border-b bg-muted">
            <div className="flex h-14 items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "size-2 rounded-full",
                  connected ? "bg-success" : "bg-destructive"
                )} />
                <h2 className="text-lg font-semibold">MCP Logs</h2>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="auto-scroll"
                  checked={autoScroll}
                  onCheckedChange={(checked: boolean) => setAutoScroll(checked)}
                />
                <label
                  htmlFor="auto-scroll"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Auto-scroll
                </label>
              </div>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index} className="whitespace-pre-wrap mb-1.5">
                  <span className="text-muted-foreground">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>
                  <span className={cn("font-medium px-1", getLevelColor(log.level))}>
                    {log.level.toUpperCase()}
                  </span>
                  {log.source ? <span className="text-muted-foreground">[{log.source}] </span> : null}
                  <span className="text-foreground">{log.message}</span>
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