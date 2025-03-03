import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ChevronRight,
  ChevronDown,
  Trash,
  Filter,
  Info,
  FileBadge,
  Download,
  X,
  Search,
  Clock,
  History,
  ArrowDown,
  Activity
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/**
 * LogEntry interface for consistent type handling
 */
interface LogEntry {
  timestamp: string;
  namespace: string;
  level: 'info' | 'error' | 'debug';
  message: string;
  server?: string; // Added server field to identify backend/frontend
}

/**
 * Props for the logs viewer component
 */
interface LogsViewerProps {
  url?: string;
  maxLogs?: number; // Added option to limit number of logs shown
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
 * Displays real-time logs from the MCP servers
 */
export default function McpLogsViewer({ url = 'http://dookie:3002/mcp/logs', maxLogs = 1000 }: LogsViewerProps) {
  // State for logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [showNamespaceFilter, setShowNamespaceFilter] = useState(false);
  const [activeNamespaces, setActiveNamespaces] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('live');
  const [isConnected, setIsConnected] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Format a log entry for display
  const formatLogEntry = (log: LogEntry) => {
    // Extract timing information if present (e.g., +240ms)
    const timingMatch = typeof log.message === 'string' ? log.message.match(/\+(\d+m?s)/) : null;
    const timing = timingMatch ? timingMatch[0] : null; // Include the + sign

    // Remove timing information from message if present
    let message = log.message;
    if (timing && typeof message === 'string') {
      message = message.replace(timing, '').trim();
    }

    return {
      namespace: log.namespace,
      message: typeof message === 'string' ? message : message,
      timing: timing,
      level: log.level,
      isError: log.level === 'error'
    };
  };

  // Get appropriate namespace color based on namespace
  const getNamespaceColor = (namespace: string) => {
    if (!namespace) return "text-gray-400";
    
    if (namespace.includes('langgraph')) return "text-green-400";
    if (namespace.includes('langchain')) return "text-purple-400";
    if (namespace.includes('websocket')) return "text-sky-400"; 
    if (namespace.includes('chat')) return "text-yellow-400";
    if (namespace.includes('model')) return "text-rose-400";
    if (namespace.includes('agent')) return "text-orange-400";
    if (namespace.includes('error')) return "text-red-400";
    
    // Default for unknown namespaces
    return "text-fuchsia-500";
  };

  // Initialize socket connection
  const socketRef = useRef<Socket | null>(null);

  // Connect to socket server on mount
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
        let level = 'info';
        
        try {
          parsedMessage = JSON.parse(message);
          if (parsedMessage.level) {
            level = parsedMessage.level;
          }
        } catch (e) {
          // Not JSON, treat as string
          parsedMessage = message;
        }
        
        // Create log entry
        const newLog: LogEntry = {
          timestamp: new Date().toISOString(),
          namespace: namespace || 'socket',
          level: level as 'info' | 'error' | 'debug',
          message: typeof parsedMessage === 'string' ? parsedMessage : JSON.stringify(parsedMessage, null, 2),
          server: 'backend'
        };
        
        // Add to logs, respecting max logs limit
        setLogs(prevLogs => {
          const newLogs = [...prevLogs, newLog];
          return newLogs.length > maxLogs ? newLogs.slice(-maxLogs) : newLogs;
        });
        
        // Auto-scroll if enabled
        if (autoScroll) {
          setTimeout(scrollToBottom, 0);
        }
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
  }, [url, autoScroll, maxLogs]);

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [logs, autoScroll]);

  // Handle scroll events to disable auto-scroll when user scrolls up
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    
    const isAtBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 50;
    
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    }
  };

  // Get unique namespaces for filtering
  const uniqueNamespaces = React.useMemo(() => {
    const namespaces = new Set<string>();
    logs.forEach(log => {
      if (log.namespace) namespaces.add(log.namespace);
    });
    return Array.from(namespaces).sort();
  }, [logs]);

  // Filter logs based on search input and active namespaces
  const filteredLogs = React.useMemo(() => {
    let filtered = logs;
    
    // First filter by active namespaces if any are selected
    if (activeNamespaces.length > 0) {
      filtered = filtered.filter(log => 
        activeNamespaces.some(ns => log.namespace.includes(ns))
      );
    }
    
    // Then filter by text search
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toString().toLowerCase().includes(lowerFilter) ||
        log.namespace.toLowerCase().includes(lowerFilter)
      );
    }
    
    return filtered;
  }, [logs, filter, activeNamespaces]);

  // Toggle namespace in active filters
  const toggleNamespace = (namespace: string) => {
    setActiveNamespaces(prev => 
      prev.includes(namespace) 
        ? prev.filter(ns => ns !== namespace)
        : [...prev, namespace]
    );
  };

  // Define scrollToBottom before using it in useEffect dependency array
  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="container py-6 space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MCP Logs</h1>
          <p className="text-muted-foreground">
            Monitor and filter logs from MCP servers in real-time
          </p>
        </div>
        
        <div className="flex border-b">
          <button
            className={`px-4 py-2 ${activeTab === 'live' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('live')}
          >
            Live Logs
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'history' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('history')}
          >
            <div className="flex items-center gap-1">
              <History className="h-4 w-4" />
              <span>Log History</span>
            </div>
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'health' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('health')}
          >
            <div className="flex items-center gap-1">
              <Activity className="h-4 w-4" />
              <span>Stream Health</span>
            </div>
          </button>
        </div>
        
        {activeTab === 'live' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Live Logs</h2>
              <p className="text-sm text-muted-foreground">
                Real-time logs from MCP servers via WebSocket connection
              </p>
            </div>
            
            <div className="border rounded-md flex flex-col h-[calc(100vh-250px)]">
              <div className="flex items-center p-2 bg-gray-900 border-b border-gray-800 gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Filter logs..."
                    className="pl-8 bg-gray-800 text-white border-gray-700 focus:border-blue-500"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                  {filter && (
                    <button 
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => setFilter('')}
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>
                
                <Button 
                  variant="outline"
                  size="sm"
                  className={`${showNamespaceFilter ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  onClick={() => setShowNamespaceFilter(!showNamespaceFilter)}
                  title="Filter by namespace"
                >
                  <Filter className="h-4 w-4" />
                </Button>
                
                <Button 
                  variant="outline"
                  size="sm"
                  className={`${showTimestamps ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  onClick={() => setShowTimestamps(!showTimestamps)}
                  title="Show timestamps"
                >
                  <Clock className="h-4 w-4" />
                </Button>
                
                <Button 
                  variant="secondary"
                  size="sm"
                  className={`${autoScroll ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                  onClick={() => {
                    setAutoScroll(true);
                    scrollToBottom();
                  }}
                >
                  <ArrowDown className="h-4 w-4 mr-1" />
                  Auto-scroll
                </Button>
                
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={() => setLogs([])}
                >
                  <Trash className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
              
              {showNamespaceFilter && uniqueNamespaces.length > 0 && (
                <div className="flex flex-wrap gap-1 p-2 bg-gray-900 border-b border-gray-800">
                  {uniqueNamespaces.map(namespace => (
                    <Button
                      key={namespace}
                      variant="outline"
                      size="sm"
                      className={`${activeNamespaces.includes(namespace) ? 'bg-blue-600 hover:bg-blue-700' : ''} ${getNamespaceColor(namespace)}`}
                      onClick={() => toggleNamespace(namespace)}
                    >
                      {namespace}
                    </Button>
                  ))}
                </div>
              )}
              
              <ScrollArea 
                ref={containerRef as React.RefObject<HTMLDivElement>}
                className="flex-1 bg-gray-950 text-white font-mono p-4 text-xs overflow-auto"
              >
                {!isConnected && (
                  <div className="text-yellow-500">Connecting to log stream...</div>
                )}
                
                {filteredLogs.map((log, index) => {
                  const formattedLog = formatLogEntry(log);
                  
                  // Extract timing from the end if present
                  const timingMatch = typeof formattedLog.message === 'string' ? 
                    formattedLog.message.match(/\s+(\+\d+m?s)$/) : null;
                  const timing = timingMatch ? timingMatch[1] : formattedLog.timing;
                  const message = typeof formattedLog.message === 'string' && timingMatch ? 
                    formattedLog.message.replace(timingMatch[0], '') : formattedLog.message;
                    
                  return (
                    <div key={index} className="whitespace-pre-wrap mb-0.5 font-mono" style={{ fontFamily: 'Menlo, Monaco, "Courier New", monospace' }}>
                      <span className="text-blue-400">[Backend]</span>{' '}
                      <span className={`${getNamespaceColor(formattedLog.namespace)}`}>
                        {formattedLog.namespace || 'unknown'}
                      </span>{' '}
                      <span className="text-white">{message}</span>
                      {timing && (
                        <span className="text-green-400">{timing}</span>
                      )}
                      {showTimestamps && (
                        <span className="text-gray-500 ml-2 text-[10px]">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  );
                })}
                
                {isConnected && filteredLogs.length === 0 && (
                  <div className="text-gray-500 italic">No logs available</div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}
        
        {activeTab === 'history' && (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            Log history functionality coming soon
          </div>
        )}
        
        {activeTab === 'health' && (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            Stream health monitoring coming soon
          </div>
        )}
      </div>
    </div>
  );
} 