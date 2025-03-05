"use client";

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { LogViewer, type LogEntry } from '@/components/shared/log-viewer';
import { v4 as uuidv4 } from 'uuid';

/**
 * Props for the MCP logs viewer component
 */
interface McpLogsViewerProps {
  url?: string;
  maxLogs?: number;
}

/**
 * Custom socket event types for MCP logs
 */
interface ServerToClientEvents {
  'debug': (message: string) => void;
  'log': (message: string) => void;
  'mcp:message': (message: string) => void;
}

/**
 * MCP Logs Viewer Component
 * Displays real-time logs from the MCP servers using the shared LogViewer component
 */
export default function McpLogsViewer({ 
  url = 'http://dookie:3002/mcp/logs', 
  maxLogs = 1000 
}: McpLogsViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!url) return;

    // Create socket connection
    const socket = io(url, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socketRef.current = socket;
    
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to log server');
    });
    
    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from log server');
    });

    const handleLog = (message: string, namespace = "") => {
      if (!message) return;
      
      try {
        // Try to parse as JSON first
        let parsedMessage;
        let level: 'info' | 'warn' | 'error' | 'debug' = 'info';
        
        try {
          parsedMessage = JSON.parse(message);
          if (parsedMessage.level) {
            level = parsedMessage.level === 'error' ? 'error' : 
                   parsedMessage.level === 'debug' ? 'debug' : 
                   parsedMessage.level === 'warn' ? 'warn' : 'info';
          }
        } catch (e) {
          // Not JSON, treat as string
          parsedMessage = message;
        }

        // Create log entry matching shared LogViewer's LogEntry interface
        const newLog: LogEntry = {
          id: uuidv4(),
          timestamp: new Date(),
          level: level,
          message: typeof parsedMessage === 'string' ? parsedMessage : JSON.stringify(parsedMessage, null, 2),
          source: namespace || 'socket',
          metadata: typeof parsedMessage === 'object' ? parsedMessage : undefined
        };
        
        // Add to logs, respecting max logs limit
        setLogs(prevLogs => {
          const newLogs = [...prevLogs, newLog];
          return newLogs.length > maxLogs ? newLogs.slice(-maxLogs) : newLogs;
        });
      } catch (err) {
        console.error('Error processing log message:', err);
      }
    };

    // Set up event listeners
    socket.on('debug', (message: string) => {
      handleLog(message, 'debug');
    });

    socket.on('log', (message: string) => {
      handleLog(message, 'log');
    });

    socket.on('mcp:message', (message: string) => {
      handleLog(message, 'mcp');
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [url, maxLogs]);

  const handleClear = () => {
    setLogs([]);
  };

  const handleExport = () => {
    const exportData = logs.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      source: log.source,
      message: log.message,
      metadata: log.metadata
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="container py-6 space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MCP Logs</h1>
          <p className="text-muted-foreground">
            Monitor and filter logs from MCP servers in real-time
          </p>
        </div>

        <LogViewer
          logs={logs}
          onClear={handleClear}
          onExport={handleExport}
          title="MCP Server Logs"
          liveUpdate={isConnected}
          height="h-[calc(100vh-250px)]"
        />
      </div>
    </div>
  );
}
